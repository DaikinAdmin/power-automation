import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import db from '@/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const discountLevels = await db.discountLevel.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        level: 'asc'
      }
    });

    return NextResponse.json(discountLevels);
  } catch (error: any) {
    console.error('Error fetching discount levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount levels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { level, discountPercentage } = body;

    if (!level || level < 1) {
      return NextResponse.json(
        { error: 'Level must be a positive number' },
        { status: 400 }
      );
    }

    if (discountPercentage === undefined || discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json(
        { error: 'Discount percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check if level already exists
    const existingLevel = await db.discountLevel.findFirst({
      where: { level: parseInt(level) }
    });

    if (existingLevel) {
      return NextResponse.json(
        { error: 'A discount level with this number already exists' },
        { status: 409 }
      );
    }

    const discountLevel = await db.discountLevel.create({
      data: {
        level: parseInt(level),
        discountPercentage: parseFloat(discountPercentage)
      },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    return NextResponse.json(discountLevel);
  } catch (error: any) {
    console.error('Error creating discount level:', error);
    return NextResponse.json(
      { error: 'Failed to create discount level' },
      { status: 500 }
    );
  }
}
