#!/bin/sh
set -e

# Ensure logs directory exists and has correct permissions
echo "📁 Setting up logs directory..."
mkdir -p /app/logs
chmod 777 /app/logs

echo "🔄 Running database migrations..."
tsx drizzle/migrate.ts

echo "✅ Migrations completed successfully!"
echo "🚀 Starting application..."
exec node server.js