import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const normalizeSubcategories = (raw: any): Array<{ name: string; slug: string; isVisible: boolean }> => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry: any) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return {
          name,
          slug: generateSlug(name),
          isVisible: true,
        };
      }

      if (typeof entry === 'object') {
        const name = (entry.name || '').trim();
        if (!name) return null;
        const slug = entry.slug ? generateSlug(entry.slug) : generateSlug(name);
        return {
          name,
          slug,
          isVisible: entry.isVisible !== undefined ? Boolean(entry.isVisible) : true,
        };
      }

      return null;
    })
    .filter((entry): entry is { name: string; slug: string; isVisible: boolean } => Boolean(entry));
};

// GET single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Drizzle implementation
    const [category] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.slug, slug))
      .limit(1);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get subcategories
    const subCategories = await db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, slug));

    const categoryWithSubs = {
      ...category,
      subCategories,
    };

    /* Prisma implementation (commented out)
    const category = await prisma.category.findUnique({
      where: { slug },
      include: { subCategories: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    */

    const response = NextResponse.json(categoryWithSubs);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug: newSlug, subcategory, isVisible } = body;

    // Validate required fields
    if (!name || !newSlug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    // Update category
    const [category] = await db
      .update(schema.category)
      .set({
        name,
        slug: newSlug,
        isVisible: isVisible !== undefined ? isVisible : true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.category.slug, slug))
      .returning();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete existing subcategories and insert new ones
    await db
      .delete(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, slug));

    if (normalizedSubcategories.length > 0) {
      await db.insert(schema.subcategories).values(
        normalizedSubcategories.map((sub) => ({
          id: randomUUID(),
          name: sub.name,
          slug: sub.slug,
          categorySlug: newSlug,
          isVisible: sub.isVisible,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      );
    }

    // Fetch updated subcategories
    const subCategories = await db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, newSlug));

    const categoryWithSubs = {
      ...category,
      subCategories,
    };

    /* Prisma implementation (commented out)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    const category = await prisma.category.update({
      where: { slug: slug },
      data: {
        name,
        slug,
        subCategories: {
          deleteMany: {},
          create: normalizedSubcategories.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            isVisible: sub.isVisible,
          })),
        },
        isVisible: isVisible !== undefined ? isVisible : true,
      },
      include: { subCategories: true },
    });
    */

    return NextResponse.json(categoryWithSubs);
  } catch (error: any) {
    console.error('Error updating category:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if category exists
    const [category] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.slug, slug))
      .limit(1);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has items
    const [itemCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(eq(schema.item.categorySlug, slug));

    if (itemCount && itemCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with items. Please move or delete items first.' },
        { status: 400 }
      );
    }

    // Delete subcategories first
    await db
      .delete(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, slug));

    // Delete category
    await db
      .delete(schema.category)
      .where(eq(schema.category.slug, slug));

    /* Prisma implementation (commented out)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categoryWithItems = await prisma.category.findUnique({
      where: { slug },
      include: { _count: { select: { items: true } } },
    });

    if (!categoryWithItems) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (categoryWithItems._count.items > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with items. Please move or delete items first.' },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { slug },
    });
    */

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
