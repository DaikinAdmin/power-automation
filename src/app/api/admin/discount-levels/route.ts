import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// import db from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError, ConflictError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    logger.info('Fetching discount levels', {
      endpoint: 'GET /api/admin/discount-levels',
    });

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

    const duration = Date.now() - startTime;
    logger.info('Discount levels fetched successfully', {
      endpoint: 'GET /api/admin/discount-levels',
      count: discountLevels.length,
      duration,
    });

    return NextResponse.json(discountLevels);
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/admin/discount-levels' });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const body = await request.json();
    const { level, discountPercentage } = body;

    logger.info('Creating discount level', {
      endpoint: 'POST /api/admin/discount-levels',
      level,
      discountPercentage,
    });

    if (!level || level < 1) {
      throw new BadRequestError('Level must be a positive number');
    }

    if (discountPercentage === undefined || discountPercentage < 0 || discountPercentage > 100) {
      throw new BadRequestError('Discount percentage must be between 0 and 100');
    }

    // Check if level already exists
    const [existingLevel] = await db
      .select()
      .from(schema.discountLevel)
      .where(eq(schema.discountLevel.level, parseInt(level)))
      .limit(1);

    if (existingLevel) {
      throw new ConflictError('A discount level with this number already exists');
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

    const duration = Date.now() - startTime;
    logger.info('Discount level created successfully', {
      endpoint: 'POST /api/admin/discount-levels',
      levelId: discountLevel.id,
      level: discountLevel.level,
      discountPercentage: discountLevel.discountPercentage,
      duration,
    });

    return NextResponse.json(levelWithCount);
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/admin/discount-levels' });
  }
}