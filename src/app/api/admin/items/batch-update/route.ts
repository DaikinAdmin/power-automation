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
    const { action, itemSlugs, filters } = body;

    if (!action || (action !== 'show' && action !== 'hide')) {
      return NextResponse.json({ error: 'Invalid action. Must be "show" or "hide"' }, { status: 400 });
    }

    const isDisplayed = action === 'show';
    let affectedCount = 0;

    // If specific item slugs are provided, update those
    if (itemSlugs && Array.isArray(itemSlugs) && itemSlugs.length > 0) {
      const result = await db
        .update(schema.item)
        .set({ 
          isDisplayed,
          updatedAt: new Date().toISOString()
        })
        .where(inArray(schema.item.slug, itemSlugs));
      
      affectedCount = itemSlugs.length;
    } 
    // Otherwise, update all items matching the filters
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

      // First, count how many items will be affected
      const itemsToUpdate = await db
        .select({ slug: schema.item.slug })
        .from(schema.item)
        .where(whereClause);

      affectedCount = itemsToUpdate.length;

      // Update the items
      if (affectedCount > 0) {
        await db
          .update(schema.item)
          .set({ 
            isDisplayed,
            updatedAt: new Date().toISOString()
          })
          .where(whereClause);
      }
    } else {
      return NextResponse.json({ error: 'Either itemSlugs or filters must be provided' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      affectedCount,
      action,
      message: `Successfully ${action === 'show' ? 'made visible' : 'hidden'} ${affectedCount} item(s)`
    });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { error: 'Failed to update items' },
      { status: 500 }
    );
  }
}
