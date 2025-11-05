import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';

const ONE_DAY_CACHE_HEADER = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=600';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const response = NextResponse.json(brand);
    response.headers.set('Cache-Control', ONE_DAY_CACHE_HEADER);
    return response;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, alias, imageLink, isVisible, createdAt } = body;

    if (!name || !alias || !imageLink) {
      return NextResponse.json({ error: 'Name, alias, and imageLink are required' }, { status: 400 });
    }

    const existingAlias = await prisma.brand.findFirst({
      where: {
        alias,
        NOT: { id: brandId },
      },
    });

    if (existingAlias) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    return NextResponse.json(brand);
  } catch (error: any) {
    console.error('Error updating brand:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brandWithRelations = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!brandWithRelations) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (brandWithRelations._count.items > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand with associated items' },
        { status: 400 }
      );
    }

    await prisma.brand.delete({ where: { id: brandId } });

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
