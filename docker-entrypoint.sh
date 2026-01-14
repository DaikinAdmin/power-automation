#!/bin/sh
set -e

echo "🔄 Running database migrations..."
tsx drizzle/migrate.ts

echo "✅ Migrations completed successfully!"
echo "🚀 Starting application..."
exec node server.js