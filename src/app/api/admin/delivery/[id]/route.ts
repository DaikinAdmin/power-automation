import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { DeliveryStatus } from '@/db/schema';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);
const VALID_DELIVERY_STATUSES: DeliveryStatus[] = [
  'PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED',
];

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);
  if (!user?.role || !AUTHORIZED_ROLES.has(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session, role: user.role };
}

// GET /api/admin/delivery/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    const [row] = await db
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
      .where(eq(schema.delivery.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json({
      delivery: {
        ...row,
        user: {
          name: row.userName,
          email: row.userEmail,
          phoneNumber: row.userPhoneNumber,
          countryCode: row.userCountryCode,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/delivery/[id] — update status and/or trackingNumber
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json() as {
      status?: string;
      trackingNumber?: string | null;
    };

    const { status, trackingNumber } = body;

    if (status !== undefined && !VALID_DELIVERY_STATUSES.includes(status as DeliveryStatus)) {
      return NextResponse.json({ error: 'Invalid delivery status' }, { status: 400 });
    }

    const updateData: Partial<typeof schema.delivery.$inferInsert> & { updatedAt: string } = {
      updatedAt: new Date().toISOString(),
    };
    if (status !== undefined) updateData.status = status as DeliveryStatus;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber ?? null;

    const [updated] = await db
      .update(schema.delivery)
      .set(updateData)
      .where(eq(schema.delivery.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json({ delivery: updated });
  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
