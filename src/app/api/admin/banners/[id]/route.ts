import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  getBannerById,
  updateBanner,
  deleteBanner,
  isUserAdmin,
} from '@/helpers/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);

    if (isNaN(bannerId)) {
      return NextResponse.json({ error: 'Invalid banner ID' }, { status: 400 });
    }

    const banner = await getBannerById(bannerId);

    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);

    if (isNaN(bannerId)) {
      return NextResponse.json({ error: 'Invalid banner ID' }, { status: 400 });
    }

    // Check if banner exists
    const existingBanner = await getBannerById(bannerId);
    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, imageUrl, linkUrl, position, device, locale, sortOrder, isActive } = body;

    const updatedBanner = await updateBanner(bannerId, {
      title,
      imageUrl,
      linkUrl,
      position,
      device,
      locale,
      sortOrder,
      isActive,
    });

    if (!updatedBanner) {
      return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
    }

    return NextResponse.json(updatedBanner);
  } catch (error: any) {
    console.error('Error updating banner:', error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const bannerId = parseInt(id);

    if (isNaN(bannerId)) {
      return NextResponse.json({ error: 'Invalid banner ID' }, { status: 400 });
    }

    // Check if banner exists
    const existingBanner = await getBannerById(bannerId);
    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const deletedBanner = await deleteBanner(bannerId);

    if (!deletedBanner) {
      return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Banner deleted successfully',
      banner: deletedBanner 
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
