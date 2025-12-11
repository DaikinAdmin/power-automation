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

// GET single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subCategories: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const response = NextResponse.json(category);
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
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
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

    // Check if slug already exists (excluding current category)
    const existingCategory = await prisma.category.findFirst({
      where: { 
        slug,
        NOT: { id: categoryId }
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    const normalizedSubcategories = normalizeSubcategories(subcategory);

    const category = await prisma.category.update({
      where: { id: categoryId },
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

    return NextResponse.json(category);
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
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
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

    // Check if category has items
    const categoryWithItems = await prisma.category.findUnique({
      where: { id: categoryId },
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
      where: { id: categoryId },
    });

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
