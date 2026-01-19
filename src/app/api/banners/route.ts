import { NextRequest, NextResponse } from 'next/server';
import { getBanners } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const position = searchParams.get('position');
    const device = searchParams.get('device');
    const locale = searchParams.get('locale');
    
    logger.info('Fetching banners', { position, device, locale });
    
    // Build filters
    const filters: any = { isActive: true };
    if (position) filters.position = position;
    if (device) filters.device = device;
    if (locale) filters.locale = locale;
    
    const banners = await getBanners(filters);
    
    const duration = Date.now() - startTime;
    logger.info('Banners fetched successfully', { 
      count: banners.length, 
      duration: `${duration}ms`,
      filters 
    });

    return NextResponse.json(banners);
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/banners',
    });
  }
}
