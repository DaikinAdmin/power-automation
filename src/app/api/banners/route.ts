import { NextRequest, NextResponse } from 'next/server';
import { getBanners } from '@/helpers/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const position = searchParams.get('position');
    const device = searchParams.get('device');
    const locale = searchParams.get('locale');
    
    // Build filters
    const filters: any = { isActive: true };
    if (position) filters.position = position;
    if (device) filters.device = device;
    if (locale) filters.locale = locale;
    
    const banners = await getBanners(filters);

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
