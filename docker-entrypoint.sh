#!/bin/sh
set -e

# Ensure logs directory exists and has correct permissions
echo "📁 Setting up logs directory..."
mkdir -p /app/logs
chown -R nextjs:nodejs /app/logs
chmod -R 755 /app/logs

echo "🔄 Running database migrations..."
su-exec nextjs tsx drizzle/migrate.ts

echo "✅ Migrations completed successfully!"
echo "🚀 Starting application..."
exec su-exec nextjs node server.js