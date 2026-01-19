import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { loggingMiddleware, requestIdMiddleware } from '@/lib/logging-middleware';
 
const intlMiddleware = createMiddleware(routing);
 
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware completely for Grafana routes - let Nginx proxy handle them
  // This must be BEFORE any other processing to avoid next-intl rewriting
  if (pathname.startsWith('/grafana')) {
    return NextResponse.next();
  }

  // Add request ID to all requests
  const requestId = request.headers.get('x-request-id') || 
    `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Add logging for all requests
  loggingMiddleware(request);

  // Handle API routes with CORS
  if (pathname.startsWith('/api')) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
      response.headers.set('x-request-id', requestId);
      return response;
    }

    // For actual API requests, continue with the request but add CORS headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('x-request-id', requestId);
    response.headers.set('x-request-id', requestId);
    
    return response;
  }

  // For non-API routes, use the intl middleware
  const response = intlMiddleware(request);
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next`, `/_vercel`, or `/grafana`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!trpc|_next|_vercel|grafana|.*\\..*).*)', '/api/:path*']
};