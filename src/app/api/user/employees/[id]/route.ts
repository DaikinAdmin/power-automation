import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user as userTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '@/lib/logger';
import {
  apiErrorHandler,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/lib/error-handler';

type Params = { params: Promise<{ id: string }> };

/** Update employee details */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError('Authentication required');
    if (session.user.role !== 'company_owner') throw new ForbiddenError('Only company owners can update employees');

    const { id } = await params;

    // Ensure employee belongs to this owner
    const [employee] = await db
      .select({ id: userTable.id, ownerId: userTable.ownerId })
      .from(userTable)
      .where(and(eq(userTable.id, id), eq(userTable.ownerId, session.user.id)));

    if (!employee) throw new NotFoundError('Employee not found');

    const body = await request.json() as {
      name?: string;
      email?: string;
      phoneNumber?: string;
    };

    if (!body.name && !body.email && !body.phoneNumber) {
      throw new BadRequestError('At least one field is required');
    }

    const updateData: Record<string, unknown> = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.phoneNumber) updateData.phoneNumber = body.phoneNumber;

    await db.update(userTable).set(updateData).where(eq(userTable.id, id));

    logger.info('Employee updated', { ownerId: session.user.id, employeeId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'PATCH /api/user/employees/[id]' });
  }
}

/** Delete an employee account */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError('Authentication required');
    if (session.user.role !== 'company_owner') throw new ForbiddenError('Only company owners can delete employees');

    const { id } = await params;

    // Ensure employee belongs to this owner
    const [employee] = await db
      .select({ id: userTable.id, ownerId: userTable.ownerId })
      .from(userTable)
      .where(and(eq(userTable.id, id), eq(userTable.ownerId, session.user.id)));

    if (!employee) throw new NotFoundError('Employee not found');

    // Hard-delete the employee (CASCADE removes sessions, accounts etc.)
    await db.delete(userTable).where(eq(userTable.id, id));

    logger.info('Employee deleted', { ownerId: session.user.id, employeeId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'DELETE /api/user/employees/[id]' });
  }
}
