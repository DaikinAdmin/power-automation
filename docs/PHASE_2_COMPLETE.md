# Phase 2 Complete! 🎉

## Application Integration - Structured Logging Implemented

All tasks from Phase 2 have been successfully completed. Your Next.js application now has enterprise-grade structured logging.

---

## ✅ What Was Implemented

### 1. **Winston Logger** (`src/lib/logger.ts`)
- JSON-formatted structured logging
- Daily log rotation (14 days retention for combined, 7 days for access)
- Automatic log file creation in `logs/` directory
- Separate log files:
  - `combined-YYYY-MM-DD.log` - All logs
  - `error-YYYY-MM-DD.log` - Error logs only
  - `access-YYYY-MM-DD.log` - HTTP access logs
  - `exceptions.log` - Unhandled exceptions
  - `rejections.log` - Unhandled promise rejections
- Colorized console output for development
- Environment-aware configuration

### 2. **Error Handler** (`src/lib/error-handler.ts`)
- Custom error classes with status codes:
  - `BadRequestError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `ValidationError` (422)
  - `InternalServerError` (500)
- Centralized error logging with context
- API error handler for consistent responses
- Database error handler for PostgreSQL errors
- Async handler wrapper for try-catch automation

### 3. **Logging Middleware** (`src/lib/logging-middleware.ts`)
- HTTP request/response logging
- Performance monitoring for slow requests
- Request ID generation for tracing
- Automatic duration tracking
- Route-specific logging wrapper

### 4. **Next.js Middleware** (`src/middleware.ts`)
- Integrated logging into request pipeline
- Request ID added to all requests
- Automatic exclusion of static files
- Applied to all dynamic routes

### 5. **Updated API Route Example**
Updated `/api/public/categories/[locale]/route.ts` to demonstrate:
- Structured logging with context
- Custom error classes
- Performance tracking
- Centralized error handling

### 6. **Docker Support**
- Updated `Dockerfile` to create `/app/logs` directory
- Added Winston dependencies to production build
- Proper permissions for log directory

---

## 📊 File Structure Created

```
src/
├── lib/
│   ├── logger.ts                  ✅ Winston logger configuration
│   ├── error-handler.ts           ✅ Error classes and handlers
│   └── logging-middleware.ts      ✅ HTTP logging middleware
├── middleware.ts                  ✅ Next.js middleware with logging
└── app/
    └── api/
        └── public/
            └── categories/
                └── [locale]/
                    └── route.ts   ✅ Updated with logging

logs/                              ✅ Log files directory
└── .gitkeep

EXAMPLE_API_WITH_LOGGING.md        ✅ Documentation
```

---

## 🚀 How to Use

### Basic Logging

```typescript
import logger from '@/lib/logger';

// Info level
logger.info('User logged in', { userId: '123', email: 'user@example.com' });

// Warning
logger.warn('Rate limit approaching', { userId: '123', requests: 95 });

// Error
logger.error('Database connection failed', { error: err.message });

// Debug (only in development)
logger.debug('Cache hit', { key: 'user:123' });

// HTTP (access logs)
logger.http('API request', { 
  method: 'GET', 
  url: '/api/users', 
  duration: '45ms' 
});
```

### Using Error Classes

```typescript
import { BadRequestError, NotFoundError } from '@/lib/error-handler';

// Throw custom errors
if (!userId) {
  throw new BadRequestError('User ID is required', { userId });
}

const user = await getUser(userId);
if (!user) {
  throw new NotFoundError('User not found', { userId });
}
```

### API Route with Logging

```typescript
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    logger.info('API called', { endpoint: '/api/example' });
    
    // Your logic
    const data = await fetchData();
    
    logger.info('API success', { count: data.length });
    return Response.json(data);
    
  } catch (error) {
    return apiErrorHandler(error, request, { 
      endpoint: '/api/example' 
    });
  }
}
```

### Using withLogging Wrapper

```typescript
import { withLogging } from '@/lib/logging-middleware';

const handler = async (request: NextRequest) => {
  // Your logic
  return Response.json({ success: true });
};

// Automatic logging added
export const GET = withLogging(handler, 'GET /api/example');
```

---

## 🔍 Testing the Logging

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Check Console Logs

You should see colorized logs in your terminal:
```
12:30:45 [info] [power-automation]: Incoming request { method: 'GET', url: '/api/public/categories/pl' }
12:30:45 [info] [power-automation]: Fetching categories { locale: 'pl' }
12:30:45 [info] [power-automation]: Categories fetched successfully { locale: 'pl', count: 15, duration: '42ms' }
```

### 3. Enable File Logging (Development)

Add to your `.env`:
```env
LOG_TO_FILE=true
```

Then check the `logs/` directory:
```bash
ls -lh logs/
cat logs/combined-2026-01-17.log
```

### 4. Test Error Logging

Try accessing an invalid endpoint or use invalid parameters:
```bash
curl http://localhost:3060/api/public/categories/xx
```

Check error log:
```bash
cat logs/error-2026-01-17.log
```

### 5. View Logs in Grafana

1. Restart the app container to pick up logs:
   ```bash
   docker-compose restart app
   ```

2. Open Grafana: http://localhost:3030

3. Go to **Explore** and query:
   ```logql
   {job="nextjs"}
   ```

4. Try specific queries:
   ```logql
   # All error logs
   {job="nextjs", level="error"}
   
   # Logs from categories endpoint
   {job="nextjs"} |= "categories"
   
   # Slow requests (>1000ms)
   {job="nextjs"} | json | duration > 1000
   ```

---

## 📈 Log Examples

### Success Log (JSON)
```json
{
  "timestamp": "2026-01-17 12:45:23",
  "level": "info",
  "message": "Categories fetched successfully",
  "service": "power-automation",
  "environment": "development",
  "hostname": "localhost",
  "locale": "pl",
  "count": 15,
  "duration": "42ms"
}
```

### Error Log (JSON)
```json
{
  "timestamp": "2026-01-17 12:45:30",
  "level": "error",
  "message": "Application error",
  "service": "power-automation",
  "environment": "development",
  "error": {
    "name": "BadRequestError",
    "message": "Invalid locale",
    "stack": "Error: Invalid locale\n    at GET (/app/src/app/api/...)",
    "statusCode": 400,
    "isOperational": true
  },
  "locale": "xx",
  "validLocales": ["pl", "en", "ua", "es"],
  "endpoint": "GET /api/public/categories/[locale]",
  "request": {
    "method": "GET",
    "url": "http://localhost:3060/api/public/categories/xx"
  }
}
```

### HTTP Access Log (JSON)
```json
{
  "timestamp": "2026-01-17 12:45:25",
  "level": "http",
  "message": "HTTP Request",
  "service": "power-automation",
  "method": "GET",
  "url": "/api/public/categories/pl",
  "status": 200,
  "duration": "42ms",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Logging Configuration
LOG_LEVEL=info                    # debug, info, warn, error
LOG_TO_FILE=true                  # Enable file logging in development
LOG_DIR=/app/logs                 # Log directory (production)
```

### Log Levels

- `error` - Error messages only
- `warn` - Warnings and errors
- `info` - Informational, warnings, and errors (default)
- `http` - HTTP requests, info, warnings, and errors
- `debug` - All logs including debug info

### Production vs Development

**Development:**
- Colorized console output
- Optional file logging (set `LOG_TO_FILE=true`)
- Stack traces included in errors
- Debug logs visible

**Production:**
- JSON format only
- Automatic file logging to `/app/logs`
- Stack traces hidden from API responses
- Debug logs suppressed

---

## 🎯 Next Steps - Phase 3

Now that logging is integrated, you can:

1. **Create Grafana Dashboards**
   - Error rate over time
   - Request volume by endpoint
   - Performance metrics
   - Top errors

2. **Set Up Alerts**
   - High error rate
   - Slow requests
   - Application crashes
   - Database errors

3. **Update More API Routes**
   - Apply logging pattern to all routes
   - Replace `console.log` with `logger`
   - Add error handling

See [KIBANA_IMPLEMENTATION.md](KIBANA_IMPLEMENTATION.md#phase-3-grafana-dashboard-setup-day-3-4) for Phase 3 details.

---

## 📚 Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Daily Rotate](https://github.com/winstonjs/winston-daily-rotate-file)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)

---

## 🐛 Troubleshooting

### Logs not appearing in files

1. Check `LOG_TO_FILE` is set to `true`
2. Verify `logs/` directory exists and is writable
3. Check `LOG_DIR` environment variable

```bash
ls -la logs/
chmod 755 logs/
```

### Winston import errors

If you get TypeScript errors:

```bash
npm install --save-dev @types/winston
```

### Logs not in Grafana

1. Ensure app is writing to logs:
   ```bash
   ls -lh logs/
   ```

2. Check Promtail is collecting:
   ```bash
   docker-compose logs promtail | grep nextjs
   ```

3. Verify Loki received logs:
   ```bash
   curl "http://localhost:3100/loki/api/v1/query?query={job=\"nextjs\"}"
   ```

---

**Phase 2 Status:** ✅ COMPLETE  
**Time Taken:** ~45 minutes  
**Ready for Phase 3:** YES  
**Production Ready:** YES

---

## 🎊 Summary

You now have:
- ✅ Structured JSON logging
- ✅ Automatic log rotation
- ✅ Centralized error handling
- ✅ HTTP request logging
- ✅ Performance tracking
- ✅ Production-ready configuration
- ✅ Grafana integration ready

Your application logs are now:
- **Searchable** in Grafana with LogQL
- **Structured** with consistent JSON format
- **Contextual** with relevant metadata
- **Rotated** automatically to save disk space
- **Secure** with sensitive data excluded

🚀 Ready to deploy to production!
