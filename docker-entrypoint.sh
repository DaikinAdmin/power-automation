#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx drizzle-kit migrate

echo "✅ Migrations completed successfully!"
echo "🚀 Starting application..."
exec node server.js
