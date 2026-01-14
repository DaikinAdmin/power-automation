# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy prisma schema for postinstall script
COPY drizzle ./drizzle

# Install dependencies (this will run postinstall which needs prisma)
RUN npm ci

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

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

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create upload directory and home directory for nextjs user
RUN mkdir -p /uploads && \
    mkdir -p /home/nextjs/.cache && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nextjs:nodejs /home/nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
