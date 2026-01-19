import { NextRequest, NextResponse } from 'next/server';
import { getActiveBanners, getBanners } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    
    const position = searchParams.get('position');
    const device = searchParams.get('device');
    const locale = searchParams.get('locale');
    
    logger.info('Fetching banners', {
      endpoint: 'GET /api/public/banners',
      position: position || undefined,
      device: device || undefined,
      locale: locale || undefined,
    });

    // If all required params provided, get active banners for specific criteria
    if (position && device && locale) {
      const banners = await getActiveBanners(position, device, locale);
      
      const duration = Date.now() - startTime;
      logger.info('Active banners fetched successfully', {
        endpoint: 'GET /api/public/banners',
        count: banners.length,
        position,
        device,
        locale,
        duration,
      });

      const response = NextResponse.json(banners);
      response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
      return response;
    }
    
    // Otherwise get all active banners with optional filters
    const filters: any = { isActive: true };
    if (position) filters.position = position;
    if (device) filters.device = device;
    if (locale) filters.locale = locale;
    
    const banners = await getBanners(filters);
    
    const duration = Date.now() - startTime;
    logger.info('Banners fetched successfully', {
      endpoint: 'GET /api/public/banners',
      count: banners.length,
      filters,
      duration,
    });

    const response = NextResponse.json(banners);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/public/banners' });
  }
}
