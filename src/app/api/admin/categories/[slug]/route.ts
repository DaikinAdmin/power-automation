import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/error-handler';

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
  const startTime = Date.now();
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    logger.info('Fetching category by slug', {
      endpoint: 'GET /api/admin/categories/[slug]',
      slug,
    });

    // Drizzle implementation
    const [category] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.slug, slug))
      .limit(1);

    if (!category) {
      throw new NotFoundError('Category not found');
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
    const category = await db.category.findUnique({
      where: { slug },
      include: { subCategories: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    */

    const duration = Date.now() - startTime;
    logger.info('Category fetched successfully', {
      endpoint: 'GET /api/admin/categories/[slug]',
      slug,
      subcategoryCount: subCategories.length,
      duration,
    });

    const response = NextResponse.json(categoryWithSubs);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/admin/categories/[slug]' });
  }
}

// PUT update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const body = await request.json();
    const { name, slug: newSlug, subcategory, isVisible } = body;

    logger.info('Updating category', {
      endpoint: 'PUT /api/admin/categories/[slug]',
      slug,
      newSlug,
      name,
    });

    // Validate required fields
    if (!name || !newSlug) {
      throw new BadRequestError('Name and slug are required');
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
      throw new NotFoundError('Category not found');
    }

    // If slug changed, update all items that reference this category
    if (slug !== newSlug) {
      await db
        .update(schema.item)
        .set({ categorySlug: newSlug })
        .where(eq(schema.item.categorySlug, slug));
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
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    const category = await db.category.update({
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

    const duration = Date.now() - startTime;
    logger.info('Category updated successfully', {
      endpoint: 'PUT /api/admin/categories/[slug]',
      slug: newSlug,
      subcategoryCount: subCategories.length,
      duration,
    });

    return NextResponse.json(categoryWithSubs);
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'PUT /api/admin/categories/[slug]' });
  }
}

// DELETE category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now();
  const { slug } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    logger.info('Deleting category', {
      endpoint: 'DELETE /api/admin/categories/[slug]',
      slug,
    });

    // Check if category exists
    const [category] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.slug, slug))
      .limit(1);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has items
    const [itemCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(eq(schema.item.categorySlug, slug));

    if (itemCount && itemCount.count > 0) {
      throw new BadRequestError('Cannot delete category with items. Please move or delete items first.');
    }

    // Check if subcategories have items
    const subcategories = await db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, slug));

    for (const subcategory of subcategories) {
      const [subItemCount] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.item)
        .where(eq(schema.item.categorySlug, subcategory.slug));

      if (subItemCount && subItemCount.count > 0) {
        throw new BadRequestError(`Cannot delete category. Subcategory "${subcategory.name}" has items. Please move or delete items first.`);
      }
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
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categoryWithItems = await db.category.findUnique({
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

    await db.category.delete({
      where: { slug },
    });
    */

    const duration = Date.now() - startTime;
    logger.info('Category deleted successfully', {
      endpoint: 'DELETE /api/admin/categories/[slug]',
      slug,
      duration,
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'DELETE /api/admin/categories/[slug]' });
  }
}
