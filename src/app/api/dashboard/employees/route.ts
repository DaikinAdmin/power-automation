import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { auth } from '@/lib/auth';
import {
  apiErrorHandler,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/error-handler';

const CreateEmployeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z
    .string()
    .regex(/^[1-9]\d{8}$/, 'Phone number must be 9 digits starting with 1-9'),
});

async function getOwnerSession(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw new UnauthorizedError('Unauthorized');
  }

  if (session.user.role !== 'company_owner') {
    throw new ForbiddenError('Only company owners can manage employees');
  }

  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getOwnerSession(request);

    const employees = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        phoneNumber: schema.user.phoneNumber,
        countryCode: schema.user.countryCode,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.ownerId, session.user.id));

    return NextResponse.json(employees);
  } catch (error) {
    return apiErrorHandler(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getOwnerSession(request);

    const body = await request.json();
    const result = CreateEmployeeSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new BadRequestError(firstError?.message ?? 'Validation failed');
    }

    const { name, email, password, phoneNumber } = result.data;

    // Check if email is already taken
    const [existing] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // Fetch owner details to copy company info
    const [owner] = await db
      .select({
        addressLine: schema.user.addressLine,
        vatNumber: schema.user.vatNumber,
        companyName: schema.user.companyName,
        country: schema.user.country,
        countryCode: schema.user.countryCode,
      })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    // Use better-auth sign-up to create the employee account
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        phoneNumber,
        userType: 'company',
        companyPosition: 'employee',
        countryCode: owner?.countryCode ?? '+48',
        userAgreement: true,
      },
      asResponse: false,
    });

    if (!signUpResult?.user?.id) {
      throw new BadRequestError('Failed to create employee account');
    }

    const newUserId = signUpResult.user.id;

    // Update employee with role, ownerId, and copied company details
    await db
      .update(schema.user)
      .set({
        role: 'company_employee',
        ownerId: session.user.id,
        addressLine: owner?.addressLine ?? '',
        vatNumber: owner?.vatNumber ?? '',
        companyName: owner?.companyName ?? '',
        country: owner?.country ?? '',
        emailVerified: true,
      })
      .where(eq(schema.user.id, newUserId));

    // Return the created employee record
    const [newEmployee] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        phoneNumber: schema.user.phoneNumber,
        countryCode: schema.user.countryCode,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, newUserId))
      .limit(1);

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    return apiErrorHandler(error, request);
  }
}
