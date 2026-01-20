import { NextRequest, NextResponse } from 'next/server';
import { getAllBrands } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');

    logger.info('Fetching brands', {
      endpoint: 'GET /api/public/brands',
      searchQuery: searchQuery || undefined,
    });

    let brands = await getAllBrands();

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      brands = brands.filter((b) =>
        b.name.toLowerCase().includes(q) || b.alias.toLowerCase().includes(q)
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Brands fetched successfully', {
      endpoint: 'GET /api/public/brands',
      count: brands.length,
      filtered: !!searchQuery,
      duration,
    });

    const response = NextResponse.json(brands);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/public/brands' });
  }
}
