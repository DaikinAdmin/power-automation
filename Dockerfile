# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy drizzle schema for postinstall script
COPY drizzle ./drizzle

# Copy scripts folder if postinstall uses it
COPY scripts ./scripts
COPY src/db ./src/db
COPY src/resources ./src/resources

# Install dependencies (this will run postinstall which needs prisma)
RUN npm install --legacy-peer-deps

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/scripts ./scripts
COPY --from=deps /app/drizzle ./drizzle
COPY --from=deps /app/src/db ./src/db
COPY --from=deps /app/src/resources ./src/resources
# Copy the rest of the application
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 3: Runner (using Alpine for smaller image)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install system dependencies using Alpine's package manager
RUN apk add --no-cache \
    wget \
    ca-certificates \
    fontconfig \
    ttf-dejavu \
    su-exec

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Install tsx for running migrations
RUN npm install -g tsx

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/db ./src/db
COPY --from=builder /app/src/resources ./src/resources

# Copy node_modules needed for migrations and runtime
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/better-auth ./node_modules/better-auth
COPY --from=builder /app/node_modules/next ./node_modules/next
COPY --from=builder /app/node_modules/winston ./node_modules/winston
COPY --from=builder /app/node_modules/winston-daily-rotate-file ./node_modules/winston-daily-rotate-file
COPY --from=builder /app/node_modules/logform ./node_modules/logform
COPY --from=builder /app/node_modules/winston-transport ./node_modules/winston-transport
COPY --from=builder /app/node_modules/triple-beam ./node_modules/triple-beam
COPY --from=builder /app/node_modules/@colors ./node_modules/@colors
COPY --from=builder /app/node_modules/color ./node_modules/color
COPY --from=builder /app/node_modules/file-stream-rotator ./node_modules/file-stream-rotator

# Patch better-auth for Next.js 16 compatibility (both static and dynamic imports)
RUN sed -i 's/from "next\/headers"/from "next\/headers.js"/g' ./node_modules/better-auth/dist/integrations/next-js.mjs && \
    sed -i 's/import("next\/headers")/import("next\/headers.js")/g' ./node_modules/better-auth/dist/integrations/next-js.mjs && \
    echo "✅ Patched better-auth for Next.js 16 compatibility"

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create upload directory, logs directory and home directory for nextjs user
RUN mkdir -p /uploads && \
    mkdir -p /app/logs && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /uploads

# Don't switch to nextjs user yet - entrypoint needs to run as root to fix volume permissions

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
