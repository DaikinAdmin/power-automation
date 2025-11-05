import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';

const ONE_DAY_CACHE_HEADER = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=600';

export async function GET() {
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

    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    const response = NextResponse.json(brands);
    response.headers.set('Cache-Control', ONE_DAY_CACHE_HEADER);
    return response;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const aliasExists = await prisma.brand.findFirst({
      where: { alias },
    });

    if (aliasExists) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
