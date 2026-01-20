import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const startTime = Date.now();
  const { userId } = await params;
  try {
    // Verify the user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    // Only allow users to get their own role (for security)
    if (session.user.id !== userId) {
      throw new ForbiddenError('Access denied');
    }

    logger.info('Fetching user role', {
      endpoint: 'GET /api/user/role/[userId]',
      userId,
    });

    // Get user role from database
    const [userData] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!userData) {
      throw new NotFoundError('User not found');
    }

    const duration = Date.now() - startTime;
    logger.info('User role fetched successfully', {
      endpoint: 'GET /api/user/role/[userId]',
      userId,
      role: userData.role,
      duration,
    });

    return NextResponse.json({ role: userData.role });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/user/role/[userId]' });
  }
}
