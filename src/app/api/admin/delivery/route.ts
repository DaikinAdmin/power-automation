import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

// GET /api/admin/delivery — list all delivery records with user + order info
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');

    // Build base query
    const rows = await db
      .select({
        id: schema.delivery.id,
        userId: schema.delivery.userId,
        orderId: schema.delivery.orderId,
        type: schema.delivery.type,
        city: schema.delivery.city,
        cityRef: schema.delivery.cityRef,
        warehouseRef: schema.delivery.warehouseRef,
        warehouseDesc: schema.delivery.warehouseDesc,
        street: schema.delivery.street,
        building: schema.delivery.building,
        flat: schema.delivery.flat,
        trackingNumber: schema.delivery.trackingNumber,
        paymentMethod: schema.delivery.paymentMethod,
        status: schema.delivery.status,
        createdAt: schema.delivery.createdAt,
        updatedAt: schema.delivery.updatedAt,
        userName: schema.user.name,
        userEmail: schema.user.email,
        userPhoneNumber: schema.user.phoneNumber,
        userCountryCode: schema.user.countryCode,
      })
      .from(schema.delivery)
      .leftJoin(schema.user, eq(schema.delivery.userId, schema.user.id))
      .orderBy(desc(schema.delivery.createdAt))
      .limit(limit)
      .offset(offset);

    const filtered = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      return true;
    });

    // Stats
    const statsRows = await db
      .select({
        status: schema.delivery.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.delivery)
      .groupBy(schema.delivery.status);

    const stats: Record<string, number> = {};
    for (const s of statsRows) {
      stats[s.status] = s.count;
    }

    const deliveries = filtered.map((r) => ({
      id: r.id,
      userId: r.userId,
      orderId: r.orderId,
      type: r.type,
      city: r.city,
      cityRef: r.cityRef,
      warehouseRef: r.warehouseRef,
      warehouseDesc: r.warehouseDesc,
      street: r.street,
      building: r.building,
      flat: r.flat,
      trackingNumber: r.trackingNumber,
      paymentMethod: r.paymentMethod,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      user: {
        name: r.userName,
        email: r.userEmail,
        phoneNumber: r.userPhoneNumber,
        countryCode: r.userCountryCode,
      },
    }));

    return NextResponse.json({ deliveries, stats, page, limit });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
