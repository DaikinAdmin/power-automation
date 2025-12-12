// import db from "@/db"; // Prisma
import { db } from "@/db"; // Drizzle
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import type { UserListResponse } from '@/helpers/types/api-responses';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Drizzle implementation - Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        emailVerified: schema.user.emailVerified,
        companyName: schema.user.companyName,
        discountLevel: schema.user.discountLevel,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .orderBy(desc(schema.user.createdAt));

    // Format response to match interface
    const response: UserListResponse[] = users.map((user) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      companyName: user.companyName,
      discountLevel: user.discountLevel,
      createdAt: user.createdAt || '',
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
