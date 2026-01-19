import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    logger.info('Redirecting to default locale', {
      endpoint: 'GET /api/public/items',
      defaultLocale: 'pl',
    });

    // Redirect to Polish locale by default for backward compatibility
    const url = new URL(request.url);
    url.pathname = '/api/public/items/pl';
    
    const duration = Date.now() - startTime;
    logger.info('Redirect executed', {
      endpoint: 'GET /api/public/items',
      redirectTo: url.pathname,
      duration,
    });

    return NextResponse.redirect(url);
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/public/items' });
  }
}