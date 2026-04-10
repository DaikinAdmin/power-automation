import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import {
  getDomainConfigByHost,
  DOMAIN_CONFIGS,
  DOMAIN_HEADER,
  DOMAIN_COOKIE,
  type DomainConfig,
} from '@/lib/domain-config';
import { loggingMiddleware } from '@/lib/logging-middleware';

/**
 * Створюємо окремі intl-middleware для кожного домену,
 * щоб кожен мав свій defaultLocale.
 */
function createIntlMiddlewareForDomain(domainConfig: DomainConfig) {
  return createMiddleware({
    locales: routing.locales,
    defaultLocale: domainConfig.defaultLocale as typeof routing.defaultLocale,
    localePrefix: 'always',
    localeDetection: false,
  });
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Request ID ---
  const requestId =
    request.headers.get('x-request-id') ||
    `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // --- Domain detection ---
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const domainConfig = getDomainConfigByHost(host);

  // --- Logging ---
  loggingMiddleware(request);

  // --- Проксі зображень: на не-PL доменах редіректимо завантаження до PL ---
  if (pathname.startsWith('/api/public/uploads/') && domainConfig.key !== 'pl') {
    const plBaseUrl = DOMAIN_CONFIGS.pl.baseUrl;
    const imageUrl = `${plBaseUrl}${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(imageUrl, { status: 301 });
  }

  // --- API routes: CORS ---
  if (pathname.startsWith('/api')) {
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
      response.headers.set(DOMAIN_HEADER, domainConfig.key);
      return response;
    }

    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('x-request-id', requestId);
    response.headers.set(DOMAIN_HEADER, domainConfig.key);
    return response;
  }

  // --- Intl middleware with defaultLocale according to domain ---
  const intlMiddleware = createIntlMiddlewareForDomain(domainConfig);
  const response = intlMiddleware(request);

  response.headers.set('x-request-id', requestId);
  response.headers.set(DOMAIN_HEADER, domainConfig.key);
  response.cookies.set(DOMAIN_COOKIE, domainConfig.key, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return response;
}

export const config = {
  matcher: ['/((?!trpc|_next|_vercel|grafana|.*\\..*).*)', '/api/:path*'],
};
