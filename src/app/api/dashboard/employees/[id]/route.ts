import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { auth } from '@/lib/auth';
import {
  apiErrorHandler,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '@/lib/error-handler';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    if (session.user.role !== 'company_owner') {
      throw new ForbiddenError('Only company owners can delete employees');
    }

    const { id } = await params;

    // Verify the target user exists and belongs to this owner
    const [employee] = await db
      .select({ id: schema.user.id, ownerId: schema.user.ownerId })
      .from(schema.user)
      .where(
        and(
          eq(schema.user.id, id),
          eq(schema.user.ownerId, session.user.id)
        )
      )
      .limit(1);

    if (!employee) {
      throw new NotFoundError('Employee not found or does not belong to you');
    }

    await db.delete(schema.user).where(eq(schema.user.id, id));

    return NextResponse.json({ message: 'Employee deleted' });
  } catch (error) {
    return apiErrorHandler(error, request);
  }
}
