import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user as userTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';

/** List all employees belonging to the authenticated company_owner */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError('Authentication required');
    if (session.user.role !== 'company_owner') throw new ForbiddenError('Only company owners can manage employees');

    const employees = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        phoneNumber: userTable.phoneNumber,
        countryCode: userTable.countryCode,
        addressLine: userTable.addressLine,
        companyName: userTable.companyName,
        vatNumber: userTable.vatNumber,
        country: userTable.country,
        role: userTable.role,
        emailVerified: userTable.emailVerified,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .where(and(eq(userTable.ownerId, session.user.id), eq(userTable.role, 'company_employee')));

    return NextResponse.json({ employees });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/user/employees' });
  }
}

/** Create a new employee under the authenticated company_owner */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) throw new UnauthorizedError('Authentication required');
    if (session.user.role !== 'company_owner') throw new ForbiddenError('Only company owners can create employees');

    // Check employee limit (max 5)
    const allEmployees = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.ownerId, session.user.id), eq(userTable.role, 'company_employee')));

    if (allEmployees.length >= 5) {
      throw new BadRequestError('Maximum of 5 employees allowed');
    }

    const body = await request.json() as {
      name: string;
      email: string;
      phoneNumber: string;
      password: string;
    };

    if (!body.name || !body.email || !body.password || !body.phoneNumber) {
      throw new BadRequestError('name, email, phoneNumber and password are required');
    }

    // Get owner details to inherit company fields
    const [owner] = await db
      .select({
        companyName: userTable.companyName,
        vatNumber: userTable.vatNumber,
        addressLine: userTable.addressLine,
        country: userTable.country,
        countryCode: userTable.countryCode,
      })
      .from(userTable)
      .where(eq(userTable.id, session.user.id));

    // Create user via better-auth sign-up endpoint
    const signupResponse = await auth.api.signUpEmail({
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
        phoneNumber: body.phoneNumber,
        userAgreement: true,
        userType: 'company',
        companyPosition: 'employee',
        companyName: owner?.companyName ?? '',
        vatNumber: owner?.vatNumber ?? '',
        addressLine: owner?.addressLine ?? '',
        country: owner?.country ?? '',
        countryCode: owner?.countryCode ?? '+48',
      },
    });

    if (!signupResponse?.user?.id) {
      throw new BadRequestError('Failed to create employee account');
    }

    // Set role to company_employee and link ownerId
    await db
      .update(userTable)
      .set({ role: 'company_employee', ownerId: session.user.id, emailVerified: true })
      .where(eq(userTable.id, signupResponse.user.id));

    logger.info('Employee created', { ownerId: session.user.id, employeeId: signupResponse.user.id });

    return NextResponse.json({ success: true, employeeId: signupResponse.user.id }, { status: 201 });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/user/employees' });
  }
}
