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

# Install dependencies (this will run postinstall which needs prisma)
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /scripts§ ./scripts
COPY --from=deps /drizzle ./drizzle

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
    ttf-dejavu

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

# Copy node_modules needed for migrations
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create upload directory and home directory for nextjs user
RUN mkdir -p /uploads && \
    mkdir -p /home/nextjs/.cache && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nextjs:nodejs /home/nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /uploads

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
