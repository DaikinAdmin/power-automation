import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, or, ilike, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemSlugs, filters } = body;

    let slugsToDelete: string[] = [];

    // If specific item slugs are provided, delete those
    if (itemSlugs && Array.isArray(itemSlugs) && itemSlugs.length > 0) {
      slugsToDelete = itemSlugs;
    } 
    // Otherwise, find all items matching the filters
    else if (filters) {
      const conditions: any[] = [];

      // Search term filter (articleId, alias, or brand)
      if (filters.searchTerm) {
        conditions.push(
          or(
            ilike(schema.item.articleId, `%${filters.searchTerm}%`),
            ilike(schema.item.alias, `%${filters.searchTerm}%`),
            ilike(schema.item.brandSlug, `%${filters.searchTerm}%`)
          )
        );
      }

      // Brand filter
      if (filters.brandSlug) {
        conditions.push(eq(schema.item.brandSlug, filters.brandSlug));
      }

      // Category filter
      if (filters.categorySlug) {
        conditions.push(eq(schema.item.categorySlug, filters.categorySlug));
      }

      // Build the WHERE clause
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get all item slugs matching the filters
      const itemsToDelete = await db
        .select({ slug: schema.item.slug })
        .from(schema.item)
        .where(whereClause);

      slugsToDelete = itemsToDelete.map(item => item.slug);
    } else {
      return NextResponse.json({ error: 'Either itemSlugs or filters must be provided' }, { status: 400 });
    }

    if (slugsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        affectedCount: 0,
        message: 'No items to delete'
      });
    }

    // Delete related records first (due to foreign key constraints)
    // Delete item details
    await db.delete(schema.itemDetails)
      .where(inArray(schema.itemDetails.itemSlug, slugsToDelete));

    // Delete item prices
    await db.delete(schema.itemPrice)
      .where(inArray(schema.itemPrice.itemSlug, slugsToDelete));

    // Finally, delete the items
    await db.delete(schema.item)
      .where(inArray(schema.item.slug, slugsToDelete));

    return NextResponse.json({
      success: true,
      affectedCount: slugsToDelete.length,
      message: `Successfully deleted ${slugsToDelete.length} item(s)`
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete items' },
      { status: 500 }
    );
  }
}
