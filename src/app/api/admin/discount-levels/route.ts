import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import db from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
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

    // Drizzle implementation - using junction table
    const discountLevelsData = await db
      .select({
        id: schema.discountLevel.id,
        level: schema.discountLevel.level,
        discountPercentage: schema.discountLevel.discountPercentage,
        createdAt: schema.discountLevel.createdAt,
        updatedAt: schema.discountLevel.updatedAt,
        userCount: sql<number>`cast(count(${schema.discountLevelToUser.b}) as integer)`,
      })
      .from(schema.discountLevel)
      .leftJoin(schema.discountLevelToUser, eq(schema.discountLevelToUser.a, schema.discountLevel.id))
      .groupBy(schema.discountLevel.id)
      .orderBy(asc(schema.discountLevel.level));

    const discountLevels = discountLevelsData.map((dl) => ({
      ...dl,
      _count: { users: dl.userCount },
      userCount: undefined,
    }));

    /* Prisma implementation (commented out)
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
    */

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

    // Check if level already exists
    const [existingLevel] = await db
      .select()
      .from(schema.discountLevel)
      .where(eq(schema.discountLevel.level, parseInt(level)))
      .limit(1);

    if (existingLevel) {
      return NextResponse.json(
        { error: 'A discount level with this number already exists' },
        { status: 409 }
      );
    }

    // Create discount level
    const [discountLevel] = await db
      .insert(schema.discountLevel)
      .values({
        id: randomUUID(),
        level: parseInt(level),
        discountPercentage: parseFloat(discountPercentage),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    const levelWithCount = {
      ...discountLevel,
      _count: { users: 0 },
    };

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    */

    return NextResponse.json(levelWithCount);
  } catch (error: any) {
    console.error('Error creating discount level:', error);
    return NextResponse.json(
      { error: 'Failed to create discount level' },
      { status: 500 }
    );
  }
}