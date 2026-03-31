import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { apiErrorHandler, UnauthorizedError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const [lastDelivery] = await db
      .select()
      .from(schema.delivery)
      .where(eq(schema.delivery.userId, session.user.id))
      .orderBy(desc(schema.delivery.createdAt))
      .limit(1);

    if (!lastDelivery) {
      return NextResponse.json({ delivery: null });
    }

    return NextResponse.json({ delivery: lastDelivery });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/delivery/last',
    });
  }
}
