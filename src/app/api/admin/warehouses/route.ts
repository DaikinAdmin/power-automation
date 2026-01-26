import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// import db from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';

// GET all warehouses
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    logger.info('Fetching warehouses', {
      endpoint: 'GET /api/admin/warehouses',
    });

    // Drizzle implementation
    const warehousesData = await db
      .select({
        id: schema.warehouse.id,
        name: schema.warehouse.name,
        countrySlug: schema.warehouse.countrySlug,
        displayedName: schema.warehouse.displayedName,
        isVisible: schema.warehouse.isVisible,
        createdAt: schema.warehouse.createdAt,
        updatedAt: schema.warehouse.updatedAt,
        count: sql<number>`cast(count(${schema.itemPrice.id}) as integer)`,
      })
      .from(schema.warehouse)
      .leftJoin(schema.itemPrice, eq(schema.warehouse.id, schema.itemPrice.warehouseId))
      .groupBy(schema.warehouse.id)
      .orderBy(asc(schema.warehouse.name));

    const warehouses = warehousesData.map((w) => ({
      ...w,
      _count: { item_price: w.count },
      count: undefined,
    }));
    
    const duration = Date.now() - startTime;
    logger.info('Warehouses fetched successfully', {
      endpoint: 'GET /api/admin/warehouses',
      count: warehouses.length,
      duration,
    });

    const response = NextResponse.json(warehouses);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    const req = new NextRequest('http://localhost/api/admin/warehouses');
    return apiErrorHandler(error, req, { endpoint: 'GET /api/admin/warehouses' });
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
    const { name, countrySlug, isVisible, displayedName } = body;

    logger.info('Creating warehouse', {
      endpoint: 'POST /api/admin/warehouses',
      name,
      countrySlug,
    });

    if (!name || !countrySlug) {
      throw new BadRequestError('Name and countrySlug are required');
    }

    // Drizzle implementation
    const [warehouse] = await db
      .insert(schema.warehouse)
      .values({
        id: randomUUID(),
        name,
        countrySlug,
        displayedName: displayedName || name,
        isVisible: isVisible ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    const duration = Date.now() - startTime;
    logger.info('Warehouse created successfully', {
      endpoint: 'POST /api/admin/warehouses',
      warehouseId: warehouse.id,
      name,
      duration,
    });

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/admin/warehouses' });
  }
}
