#!/bin/sh
set -e

echo "🔄 Running database migrations..."
./node_modules/.bin/tsx drizzle/migrate.ts

echo "✅ Migrations completed successfully!"
echo "🚀 Starting application..."
exec node server.js