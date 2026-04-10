import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isValidDeliveryStatus } from '@/helpers/delivery';
import { isUserAdmin } from '@/helpers/db/queries';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';
import logger from '@/lib/logger';

async function checkAdminAccess(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const isAdmin = await isUserAdmin(session.user.id);
  if (!isAdmin) {
    throw new ForbiddenError('Admin access required');
  }
  return session;
}

// GET /api/admin/delivery/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const endpoint = 'GET /api/admin/delivery/[id]';

  try {
    await checkAdminAccess(request);
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
    return apiErrorHandler(error, request, { 
      endpoint, 
      duration: Date.now() - startTime 
    });
  }
}

// PATCH /api/admin/delivery/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const endpoint = 'PATCH /api/admin/delivery/[id]';

  try {
    await checkAdminAccess(request);
    const { id } = await params;
    
    const body = await request.json();
    const { status, trackingNumber } = body;

    // Валідація через BadRequestError, як у bulk
    if (status !== undefined && !isValidDeliveryStatus(status)) {
      throw new BadRequestError('Invalid delivery status');
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (status !== undefined) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber ?? null;

    const [updated] = await db
      .update(schema.delivery)
      .set(updateData)
      .where(eq(schema.delivery.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    logger.info('Delivery updated successfully', { 
      endpoint, 
      deliveryId: id,
      duration: Date.now() - startTime 
    });

    return NextResponse.json({ delivery: updated });
  } catch (error) {
    return apiErrorHandler(error, request, { 
      endpoint, 
      duration: Date.now() - startTime 
    });
  }
}