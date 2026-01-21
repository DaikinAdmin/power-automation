import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError, ConflictError } from '@/lib/error-handler';

const ONE_DAY_CACHE_HEADER = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=600';

export async function GET() {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    logger.info('Fetching brands', {
      endpoint: 'GET /api/admin/brands',
    });

    // Drizzle implementation
    const brands = await db
      .select()
      .from(schema.brand)
      .orderBy(asc(schema.brand.name));

    // Get item counts for each brand
    const itemCounts = await db
      .select({
        brandSlug: schema.item.brandSlug,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(schema.item)
      .groupBy(schema.item.brandSlug);

    const brandsWithCounts = brands.map((brand) => {
      const countObj = itemCounts.find((c) => c.brandSlug === brand.alias);
      return {
        ...brand,
        _count: {
          items: countObj?.count || 0,
        },
      };
    });

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brands = await db.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
    */

    const duration = Date.now() - startTime;
    logger.info('Brands fetched successfully', {
      endpoint: 'GET /api/admin/brands',
      count: brandsWithCounts.length,
      duration,
    });

    const response = NextResponse.json(brandsWithCounts);
    response.headers.set('Cache-Control', ONE_DAY_CACHE_HEADER);
    return response;
  } catch (error) {
    const req = new NextRequest('http://localhost/api/admin/brands');
    return apiErrorHandler(error, req, { endpoint: 'GET /api/admin/brands' });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const body = await request.json();
    const { name, alias, imageLink, isVisible, createdAt } = body;

    logger.info('Creating brand', {
      endpoint: 'POST /api/admin/brands',
      name,
      alias,
    });

    if (!name || !alias || !imageLink) {
      throw new BadRequestError('Name, alias, and imageLink are required');
    }

    // Check if alias already exists
    const [aliasExists] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.alias, alias))
      .limit(1);

    if (aliasExists) {
      throw new ConflictError('Brand with this alias already exists');
    }

    // Create brand
    const now = createdAt || new Date().toISOString();
    const [brand] = await db
      .insert(schema.brand)
      .values({
        id: randomUUID(),
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const aliasExists = await db.brand.findFirst({
      where: { alias },
    });

    if (aliasExists) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    const brand = await db.brand.create({
      data: {
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });
    */

    const duration = Date.now() - startTime;
    logger.info('Brand created successfully', {
      endpoint: 'POST /api/admin/brands',
      brandId: brand.id,
      name,
      alias,
      duration,
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/admin/brands' });
  }
}
