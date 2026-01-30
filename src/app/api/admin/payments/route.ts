import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc, and, or, like, ilike } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session, role: user.role };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';

    logger.info('Fetching payments', {
      endpoint: 'GET /api/admin/payments',
      role: authResult.role,
      search,
      statusFilter,
    });

    // Build query conditions
    let whereConditions: any[] = [];

    // Base query to get payments with order and user data
    let query = db
      .select({
        paymentId: schema.payment.id,
        paymentSessionId: schema.payment.sessionId,
        paymentAmount: schema.payment.amount,
        paymentCurrency: schema.payment.currency,
        paymentStatus: schema.payment.status,
        paymentMethod: schema.payment.paymentMethod,
        paymentTransactionId: schema.payment.transactionId,
        paymentCreatedAt: schema.payment.createdAt,
        paymentUpdatedAt: schema.payment.updatedAt,
        orderId: schema.order.id,
        orderStatus: schema.order.status,
        orderTotalPrice: schema.order.originalTotalPrice,
        userId: schema.user.id,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.payment)
      .leftJoin(schema.order, eq(schema.payment.orderId, schema.order.id))
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id));

    // Apply filters
    if (search) {
      whereConditions.push(
        or(
          ilike(schema.user.email, `%${search}%`),
          ilike(schema.order.id, `%${search}%`),
          ilike(schema.payment.sessionId, `%${search}%`)
        )
      );
    }

    if (statusFilter && statusFilter !== 'ALL') {
      whereConditions.push(eq(schema.payment.status, statusFilter as any));
    }

    // Apply where conditions if any exist
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    // Execute query with ordering
    const paymentsData = await query.orderBy(desc(schema.payment.createdAt));

    // Format payments data
    const payments = paymentsData.map((payment) => ({
      id: payment.paymentId,
      sessionId: payment.paymentSessionId,
      amount: payment.paymentAmount,
      currency: payment.paymentCurrency,
      status: payment.paymentStatus,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.paymentTransactionId,
      createdAt: payment.paymentCreatedAt,
      updatedAt: payment.paymentUpdatedAt,
      order: payment.orderId ? {
        id: payment.orderId,
        status: payment.orderStatus,
        totalPrice: payment.orderTotalPrice,
      } : null,
      user: payment.userId ? {
        id: payment.userId,
        name: payment.userName,
        email: payment.userEmail,
      } : null,
    }));

    const duration = Date.now() - startTime;
    logger.info('Payments fetched successfully', {
      count: payments.length,
      duration,
    });

    return NextResponse.json({
      payments,
      viewerRole: authResult.role,
    });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/admin/payments',
    });
  }
}
