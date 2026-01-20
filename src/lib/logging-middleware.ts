import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import logger, { logHttpRequest } from '@/lib/logger';

/**
 * Logging middleware for Next.js
 * Logs all incoming HTTP requests with timing information
 */
export function loggingMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;
  const url = pathname + search;

  // Skip logging for static files and internal Next.js routes
  const shouldSkipLogging = 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/);

  if (!shouldSkipLogging) {
    // Log incoming request
    logger.http('Incoming request', {
      method: request.method,
      url,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });
  }

  // Create response
  const response = NextResponse.next();

  // Calculate and log duration if not skipped
  if (!shouldSkipLogging) {
    const duration = Date.now() - startTime;
    
    // Note: In Next.js middleware, we can't access the final response status
    // This will be logged again in API routes with actual status codes
    logger.http('Request processed', {
      method: request.method,
      url,
      duration: duration, // Store as number (milliseconds)
    });
  }

  return response;
}

/**
 * Create a wrapper for API route handlers that adds logging
 */
export function withLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response> | Response,
  routeName?: string
) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now();
    let request: NextRequest | Request | undefined;
    
    // Try to find the request object in arguments
    for (const arg of args) {
      if (arg && typeof arg === 'object' && ('url' in arg || 'method' in arg)) {
        request = arg as NextRequest | Request;
        break;
      }
    }

    const logContext: any = {
      route: routeName,
    };

    if (request) {
      logContext.method = request.method;
      logContext.url = request.url;
    }

    try {
      logger.info('API route called', logContext);
      
      const response = await handler(...args);
      const duration = Date.now() - startTime;

      // Log successful response
      if (request) {
        logHttpRequest(
          {
            method: request.method,
            url: request.url,
            headers: request.headers,
          },
          {
            statusCode: response.status,
          },
          duration
        );
      } else {
        logger.http('API route completed', {
          ...logContext,
          status: response.status,
          duration: duration, // Store as number (milliseconds)
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('API route error', {
        ...logContext,
        duration: duration, // Store as number (milliseconds)
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      });

      throw error;
    }
  };
}

/**
 * Performance monitoring middleware
 * Logs slow requests
 */
export function performanceMonitoring(
  threshold: number = 1000 // Log if request takes more than 1 second
) {
  return (request: NextRequest) => {
    const startTime = Date.now();
    const response = NextResponse.next();
    const duration = Date.now() - startTime;

    if (duration > threshold) {
      logger.warn('Slow request detected', {
        method: request.method,
        url: request.url,
        duration: duration, // Store as number (milliseconds)
        threshold: threshold,
      });
    }

    return response;
  };
}

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
export function requestIdMiddleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 
    `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);

  return response;
}
