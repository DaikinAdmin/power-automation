import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAllBanners,
  getBanners,
  createBanner,
  isUserAdmin,
} from '@/helpers/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    const position = searchParams.get('position');
    const device = searchParams.get('device');
    const locale = searchParams.get('locale');
    const isActiveParam = searchParams.get('isActive');
    
    // Build filters
    const filters: any = {};
    if (position) filters.position = position;
    if (device) filters.device = device;
    if (locale) filters.locale = locale;
    if (isActiveParam !== null) filters.isActive = isActiveParam === 'true';
    
    const banners = Object.keys(filters).length > 0 
      ? await getBanners(filters)
      : await getAllBanners();

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, imageUrl, linkUrl, position, device, locale, sortOrder, isActive } = body;

    // Validate required fields
    if (!imageUrl || !position || !locale) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, position, locale' },
        { status: 400 }
      );
    }

    const newBanner = await createBanner({
      title,
      imageUrl,
      linkUrl,
      position,
      device,
      locale,
      sortOrder,
      isActive,
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error: any) {
    console.error('Error creating banner:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Banner with this position, device, and locale already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
