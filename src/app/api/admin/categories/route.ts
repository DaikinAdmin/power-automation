import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';

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
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { subCategories: true },
    });
    const response = NextResponse.json(categories);
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
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'admin') {
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
    const existingCategory = await prisma.category.findFirst({
      where: { slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    const category = await prisma.category.create({
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

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
