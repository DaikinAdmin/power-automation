import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import db from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const discountLevel = await db.discountLevel.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!discountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    return NextResponse.json(discountLevel);
  } catch (error: any) {
    console.error('Error fetching discount level:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount level' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (user?.role !== 'ADMIN') {
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

    // Check if the discount level exists
    const existingDiscountLevel = await db.discountLevel.findUnique({
      where: { id }
    });

    if (!existingDiscountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    // Check if level already exists (but not for the current record)
    const levelExists = await db.discountLevel.findFirst({
      where: {
        level: parseInt(level),
        id: { not: id }
      }
    });

    if (levelExists) {
      return NextResponse.json(
        { error: 'A discount level with this number already exists' },
        { status: 409 }
      );
    }

    const updatedDiscountLevel = await db.discountLevel.update({
      where: { id },
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

    return NextResponse.json(updatedDiscountLevel);
  } catch (error: any) {
    console.error('Error updating discount level:', error);
    return NextResponse.json(
      { error: 'Failed to update discount level' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the discount level exists
    const existingDiscountLevel = await db.discountLevel.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!existingDiscountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    // Remove discount level from all users first
    if (existingDiscountLevel._count.users > 0) {
      await db.user.updateMany({
        where: {
          DiscountLevel: {
            some: {
              id: id
            }
          }
        },
        data: {
          discountLevel: null
        }
      });

      // Disconnect all users from this discount level
      await db.discountLevel.update({
        where: { id },
        data: {
          users: {
            set: []
          }
        }
      });
    }

    // Delete the discount level
    await db.discountLevel.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Discount level deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting discount level:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount level' },
      { status: 500 }
    );
  }
}
