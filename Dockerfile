FROM node:24-alpine AS base

# Stage 1: Dependencies


FROM base AS prod-deps
# Access PNPM with Corepack
RUN corepack enable
# Install apk and curl
RUN apk update && apk add curl bash
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Fetch deps with caching
RUN --mount=type=cache,id=s/<service-id>-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile
# Install prod deps with caching AND add tsx for migrations
RUN --mount=type=cache,id=s/<service-id>-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod && pnpm add tsx

# Stage 2: Builder
FROM base AS build

RUN corepack enable
RUN apk update && apk add curl bash
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Fetch deps with caching
RUN --mount=type=cache,id=s/<service-id>-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile
# Install all deps with caching
RUN --mount=type=cache,id=s/<service-id>-/root/.local/share/pnpm/store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application with caching
RUN --mount=type=cache,id=s/<service-id>-/root/.cache/pnpm,target=/root/.cache/pnpm \
    NODE_ENV=production pnpm run build

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
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

# Copy node_modules needed for migrations (drizzle-orm, postgres, etc)
COPY --from=prod-deps /app/node_modules ./node_modules

# Create upload directory and home directory for nextjs user
RUN mkdir -p /uploads && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /home/nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /uploads

# Copy and set up entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
