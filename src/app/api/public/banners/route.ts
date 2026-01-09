import { NextRequest, NextResponse } from 'next/server';
import { getActiveBanners, getBanners } from '@/helpers/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const position = searchParams.get('position');
    const device = searchParams.get('device');
    const locale = searchParams.get('locale');
    
    // If all required params provided, get active banners for specific criteria
    if (position && device && locale) {
      const banners = await getActiveBanners(position, device, locale);
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
    const response = NextResponse.json(banners);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
