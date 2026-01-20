// import db from "@/db"; // Prisma
import { db } from "@/db"; // Drizzle
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import type { UserListResponse } from '@/helpers/types/api-responses';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Drizzle implementation - Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
    
    logger.info('Fetching all users (admin)', { userId: session.user.id });

    const users = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        emailVerified: schema.user.emailVerified,
        companyName: schema.user.companyName,
        discountLevel: schema.discountLevelToUser.a,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .leftJoin(schema.discountLevelToUser, eq(schema.discountLevelToUser.b, schema.user.id))
      .orderBy(desc(schema.user.createdAt));

    // Format response to match interface
    const response: UserListResponse[] = users.map((user) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      emailVerified: user.emailVerified,
      companyName: user.companyName || '',
      discountLevel: user.discountLevel || null,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    }));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        companyName: true,
        discountLevel: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    */

    const duration = Date.now() - startTime;
    logger.info('Users fetched successfully', { 
      userId: session.user.id,
      usersCount: response.length,
      duration: duration
    });

    return NextResponse.json(response);
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/admin/users',
    });
  }
}
