import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, asc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';

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

// GET all categories
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedError('User not authenticated');
    }
    
    logger.info('Fetching all categories (admin)', { userId: session.user?.id });

    // Drizzle implementation
    const categories = await db
      .select()
      .from(schema.category)
      .orderBy(asc(schema.category.name));

    // Fetch subcategories for all categories
    const subcategories = await db
      .select()
      .from(schema.subcategories);

    // Map subcategories to categories
    const categoriesWithSubs = categories.map((cat) => ({
      ...cat,
      subCategories: subcategories.filter((sub) => sub.categorySlug === cat.slug),
    }));

    /* Prisma implementation (commented out)
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { subCategories: true },
    });
    */

    const response = NextResponse.json(categoriesWithSubs);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Drizzle implementation - Check if user is admin
    const isAdmin = await isUserAdmin(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, subcategory, isVisible } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const [existingCategory] = await db
      .select()
      .from(schema.category)
      .where(eq(schema.category.slug, slug))
      .limit(1);

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    // Create category
    const now = new Date().toISOString();
    const categoryId = randomUUID();
    
    const [category] = await db
      .insert(schema.category)
      .values({
        id: categoryId,
        name,
        slug,
        isVisible: isVisible ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create subcategories if any
    if (normalizedSubcategories.length > 0) {
      await db.insert(schema.subcategories).values(
        normalizedSubcategories.map((sub) => ({
          id: randomUUID(),
          name: sub.name,
          slug: sub.slug,
          categorySlug: category.id,
          isVisible: sub.isVisible,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingCategory = await db.category.findFirst({
      where: { slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        subCategories: {
          create: normalizedSubcategories.map((sub) => ({
            name: sub.name,
            slug: sub.slug,
            isVisible: sub.isVisible,
          })),
        },
        isVisible: isVisible ?? true,
      },
    });
    */

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
