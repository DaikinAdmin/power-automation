# Example: Updated API Route with Logging

This is an example of how to update an existing API route to use the new logging infrastructure.

## Original Route
`src/app/api/public/categories/[locale]/route.ts`

## Changes Made

1. **Import logging utilities**
   ```typescript
   import logger from '@/lib/logger';
   import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';
   import { withLogging } from '@/lib/logging-middleware';
   ```

2. **Replace console.error with structured logging**
   - Before: `console.error('Error fetching categories:', error);`
   - After: Uses `apiErrorHandler` for consistent error responses and logging

3. **Add request context logging**
   - Log when API is called with relevant context
   - Track performance
   - Include locale parameter in logs

4. **Use custom error classes**
   - `BadRequestError` for invalid locales
   - Automatic error logging and proper HTTP status codes

## Updated Implementation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCategoriesByLocale } from "@/helpers/db/queries";
import type { CategoryResponse } from "@/helpers/types/api-responses";
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { locale } = await params;
    
    // Log the request
    logger.info('Fetching categories', { locale });
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale', { 
        locale, 
        validLocales 
      });
    }

    // Fetch categories
    const categories: CategoryResponse[] = await getCategoriesByLocale(
      locale.toLowerCase()
    );

    const duration = Date.now() - startTime;
    
    // Log successful response
    logger.info('Categories fetched successfully', {
      locale,
      count: categories.length,
      duration: `${duration}ms`,
    });

    const response = NextResponse.json(categories);
    response.headers.set(
      'Cache-Control',
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=300'
    );
    
    return response;
  } catch (error) {
    // Centralized error handling with logging
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/public/categories/[locale]',
    });
  }
}
```

## Benefits

✅ **Structured Logging**: All logs are JSON formatted and searchable in Grafana
✅ **Performance Tracking**: Request duration is logged
✅ **Error Context**: Errors include full request context
✅ **Consistent Error Responses**: All errors follow the same format
✅ **Production Ready**: Sensitive data hidden in production

## Logs You'll See in Grafana

### Success Case
```json
{
  "timestamp": "2026-01-17 12:45:23",
  "level": "info",
  "message": "Categories fetched successfully",
  "service": "power-automation",
  "locale": "pl",
  "count": 15,
  "duration": "45ms"
}
```

### Error Case
```json
{
  "timestamp": "2026-01-17 12:45:25",
  "level": "error",
  "message": "Application error",
  "service": "power-automation",
  "error": {
    "name": "BadRequestError",
    "message": "Invalid locale",
    "statusCode": 400,
    "isOperational": true
  },
  "locale": "xx",
  "validLocales": ["pl", "en", "ua", "es"],
  "endpoint": "GET /api/public/categories/[locale]"
}
```

## Usage with withLogging Wrapper

Alternatively, you can use the `withLogging` wrapper for automatic logging:

```typescript
import { withLogging } from '@/lib/logging-middleware';

const handler = async (
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) => {
  // Your logic here
  const { locale } = await params;
  const categories = await getCategoriesByLocale(locale);
  return NextResponse.json(categories);
};

export const GET = withLogging(handler, 'GET /api/public/categories/[locale]');
```

This automatically adds:
- Request logging
- Response logging  
- Performance tracking
- Error handling
