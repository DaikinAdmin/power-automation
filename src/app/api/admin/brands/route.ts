import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, asc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';

const ONE_DAY_CACHE_HEADER = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=600';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Drizzle implementation
    const brands = await db
      .select()
      .from(schema.brand)
      .orderBy(asc(schema.brand.name));

    // Get item counts for each brand
    const brandAliases = brands.map((b) => b.alias);
    const itemCounts = await db
      .select({
        brandSlug: schema.item.brandSlug,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(schema.item)
      .where(sql`${schema.item.brandSlug} = ANY(${brandAliases})`)
      .groupBy(schema.item.brandSlug);

    const brandsWithCounts = brands.map((brand) => {
      const countObj = itemCounts.find((c) => c.brandSlug === brand.alias);
      return {
        ...brand,
        _count: {
          items: countObj?.count || 0,
        },
      };
    });

    /* Prisma implementation (commented out)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });
    */

    const response = NextResponse.json(brandsWithCounts);
    response.headers.set('Cache-Control', ONE_DAY_CACHE_HEADER);
    return response;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, alias, imageLink, isVisible, createdAt } = body;

    if (!name || !alias || !imageLink) {
      return NextResponse.json({ error: 'Name, alias, and imageLink are required' }, { status: 400 });
    }

    // Check if alias already exists
    const [aliasExists] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.alias, alias))
      .limit(1);

    if (aliasExists) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    // Create brand
    const now = createdAt || new Date().toISOString();
    const [brand] = await db
      .insert(schema.brand)
      .values({
        id: randomUUID(),
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    /* Prisma implementation (commented out)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const aliasExists = await prisma.brand.findFirst({
      where: { alias },
    });

    if (aliasExists) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });
    */

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
