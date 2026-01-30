import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

const ONE_DAY_CACHE_HEADER = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=600';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Drizzle implementation
    const [brand] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.id, brandId))
      .limit(1);

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get item count
    const [itemCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(eq(schema.item.brandSlug, brand.alias));

    const brandWithCount = {
      ...brand,
      _count: { items: itemCount?.count || 0 },
    };

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brand = await db.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    */

    const response = NextResponse.json(brandWithCount);
    response.headers.set('Cache-Control', ONE_DAY_CACHE_HEADER);
    return response;
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, alias, imageLink, isVisible, createdAt } = body;

    if (!name || !alias || !imageLink) {
      return NextResponse.json({ error: 'Name, alias, and imageLink are required' }, { status: 400 });
    }

    // Check if alias exists for different brand
    const [existingAlias] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.alias, alias))
      .limit(1);

    if (existingAlias && existingAlias.id !== brandId) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    // Update brand
    const [brand] = await db
      .update(schema.brand)
      .set({
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt || undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.brand.id, brandId))
      .returning();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingAlias = await db.brand.findFirst({
      where: {
        alias,
        NOT: { id: brandId },
      },
    });

    if (existingAlias) {
      return NextResponse.json({ error: 'Brand with this alias already exists' }, { status: 400 });
    }

    const brand = await db.brand.update({
      where: { id: brandId },
      data: {
        name,
        alias,
        imageLink,
        isVisible: isVisible ?? true,
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
    });
    */

    return NextResponse.json(brand);
  } catch (error: any) {
    console.error('Error updating brand:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if brand exists and get its alias
    const [brand] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.id, brandId))
      .limit(1);

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check for associated items
    const [itemCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(eq(schema.item.brandSlug, brand.alias));

    if (itemCount && itemCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand with associated items' },
        { status: 400 }
      );
    }

    // Delete brand
    await db.delete(schema.brand).where(eq(schema.brand.id, brandId));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const brandWithRelations = await db.brand.findUnique({
      where: { id: brandId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!brandWithRelations) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (brandWithRelations._count.items > 0) {
      return NextResponse.json(
        { error: 'Cannot delete brand with associated items' },
        { status: 400 }
      );
    }

    await db.brand.delete({ where: { id: brandId } });
    */

    return NextResponse.json({ message: 'Brand deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
