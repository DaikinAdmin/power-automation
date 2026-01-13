import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import db from '@/db';
import { db } from '@/db';
import { eq, and, ne, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

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

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Drizzle implementation
    const [discountLevel] = await db
      .select()
      .from(schema.discountLevel)
      .where(eq(schema.discountLevel.id, id))
      .limit(1);

    if (!discountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    // Get user count via join table _DiscountLevelToUser
    const [userCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.discountLevelToUser)
      .where(eq(schema.discountLevelToUser.a, id));

    const levelWithCount = {
      ...discountLevel,
      _count: { users: userCount?.count || 0 },
    };

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
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
    */

    return NextResponse.json(levelWithCount);
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

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
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
    const [existingDiscountLevel] = await db
      .select()
      .from(schema.discountLevel)
      .where(eq(schema.discountLevel.id, id))
      .limit(1);

    if (!existingDiscountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    // Check if level already exists (but not for the current record)
    const [levelExists] = await db
      .select()
      .from(schema.discountLevel)
      .where(
        and(
          eq(schema.discountLevel.level, parseInt(level)),
          ne(schema.discountLevel.id, id)
        )
      )
      .limit(1);

    if (levelExists) {
      return NextResponse.json(
        { error: 'A discount level with this number already exists' },
        { status: 409 }
      );
    }

    // Update discount level
    const [updatedDiscountLevel] = await db
      .update(schema.discountLevel)
      .set({
        level: parseInt(level),
        discountPercentage: parseFloat(discountPercentage),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.discountLevel.id, id))
      .returning();

    // Get user count via join table _DiscountLevelToUser
    const [userCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.discountLevelToUser)
      .where(eq(schema.discountLevelToUser.a, id));

    const levelWithCount = {
      ...updatedDiscountLevel,
      _count: { users: userCount?.count || 0 },
    };

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingDiscountLevel = await db.discountLevel.findUnique({
      where: { id }
    });

    if (!existingDiscountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

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
    */

    return NextResponse.json(levelWithCount);
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

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the discount level exists
    const [existingDiscountLevel] = await db
      .select()
      .from(schema.discountLevel)
      .where(eq(schema.discountLevel.id, id))
      .limit(1);

    if (!existingDiscountLevel) {
      return NextResponse.json({ error: 'Discount level not found' }, { status: 404 });
    }

    // Get user count via join table _DiscountLevelToUser
    const [userCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.discountLevelToUser)
      .where(eq(schema.discountLevelToUser.a, id));

    // Remove relations from join table first
    if (userCount && userCount.count > 0) {
      await db
        .delete(schema.discountLevelToUser)
        .where(eq(schema.discountLevelToUser.a, id));
    }

    // Delete the discount level
    await db
      .delete(schema.discountLevel)
      .where(eq(schema.discountLevel.id, id));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

      await db.discountLevel.update({
        where: { id },
        data: {
          users: {
            set: []
          }
        }
      });
    }

    await db.discountLevel.delete({
      where: { id }
    });
    */

    return NextResponse.json({ message: 'Discount level deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting discount level:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount level' },
      { status: 500 }
    );
  }
}
