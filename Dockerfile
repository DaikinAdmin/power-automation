# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Copy prisma schema for postinstall script
COPY prisma ./prisma

# Install dependencies (this will run postinstall which needs prisma)
RUN npm ci

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy prisma folder
COPY prisma ./prisma
COPY prisma.config.mjs ./prisma.config.mjs
COPY prisma.config.ts ./prisma.config.ts

# Copy the rest of the application
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma Client for both native and Debian
RUN npx prisma generate

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

# Copy Prisma files and config (needed for migrations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.mjs ./prisma.config.mjs
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# # Copy tsx and all its dependencies (for seed scripts)
# COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
# COPY --from=builder /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
# COPY --from=builder /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
# COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
# COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild

# Copy Playwright for browser automation
# COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core
# COPY --from=builder /app/node_modules/@playwright ./node_modules/@playwright

# Install Playwright browsers as root
# ENV PLAYWRIGHT_BROWSERS_PATH=/home/nextjs/.cache/ms-playwright
# RUN npx playwright install --with-deps chromium

# Create upload directory and home directory for nextjs user
RUN mkdir -p /uploads && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
