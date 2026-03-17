import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';

interface DescriptionItem {
  articleId: string;
  brand?: string;
  seller?: string;
  imageUrl?: string;
  alias?: string;
  isDisplayed?: boolean;
  translations?: Record<string, {
    name?: string;
    description?: string;
    specifications?: string;
    metaDescription?: string;
    metaKeywords?: string;
  }>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    const body = await request.json();
    const { items } = body as { items: DescriptionItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items array is required');
    }

    logger.info('Starting bulk description update', {
      endpoint: 'POST /api/admin/items/bulk-update-descriptions',
      itemCount: items.length,
    });

    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const articleId = item.articleId?.toString().trim();
        if (!articleId) {
          errors.push('Missing articleId in row');
          continue;
        }

        const dbItems = await db
          .select({ slug: schema.item.slug })
          .from(schema.item)
          .where(eq(schema.item.articleId, articleId))
          .limit(1);

        if (dbItems.length === 0) {
          notFound++;
          errors.push(`Item not found: ${articleId}`);
          continue;
        }

        const itemSlug = dbItems[0].slug;

        // Update item-level fields
        const itemUpdate: Record<string, any> = {};
        if (item.imageUrl !== undefined) {
          itemUpdate.itemImageLink = item.imageUrl.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
        if (item.alias !== undefined) itemUpdate.alias = item.alias;
        if (item.isDisplayed !== undefined) itemUpdate.isDisplayed = item.isDisplayed;
        if (item.brand !== undefined) {
          const brandResult = await db
            .select({ alias: schema.brand.alias })
            .from(schema.brand)
            .where(eq(schema.brand.name, item.brand))
            .limit(1);
          if (brandResult.length > 0) itemUpdate.brandSlug = brandResult[0].alias;
        }
        if (Object.keys(itemUpdate).length > 0) {
          itemUpdate.updatedAt = new Date().toISOString();
          await db.update(schema.item).set(itemUpdate).where(eq(schema.item.slug, itemSlug));
        }

        // Update seller across all existing locale entries
        if (item.seller !== undefined) {
          await db.update(schema.itemDetails)
            .set({ seller: item.seller })
            .where(eq(schema.itemDetails.itemSlug, itemSlug));
        }

        // Update translations
        if (item.translations && Object.keys(item.translations).length > 0) {
          for (const [locale, data] of Object.entries(item.translations)) {
            if (!data.name && !data.description && !data.specifications && !data.metaDescription && !data.metaKeywords) continue;

            const existing = await db
              .select()
              .from(schema.itemDetails)
              .where(
                and(
                  eq(schema.itemDetails.itemSlug, itemSlug),
                  eq(schema.itemDetails.locale, locale)
                )
              )
              .limit(1);

            if (existing.length > 0) {
              const updateData: Record<string, any> = {};
              if (data.name) updateData.itemName = data.name;
              if (data.description) updateData.description = data.description;
              if (data.specifications !== undefined) updateData.specifications = data.specifications;
              if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
              if (data.metaKeywords !== undefined) updateData.metaKeyWords = data.metaKeywords;
              if (item.seller !== undefined) updateData.seller = item.seller;
              await db
                .update(schema.itemDetails)
                .set(updateData)
                .where(eq(schema.itemDetails.id, existing[0].id));
            } else {
              await db
                .insert(schema.itemDetails)
                .values({
                  itemSlug,
                  locale,
                  itemName: data.name || articleId,
                  description: data.description || '',
                  specifications: data.specifications || null,
                  metaDescription: data.metaDescription || null,
                  metaKeyWords: data.metaKeywords || null,
                  seller: item.seller || null,
                });
            }
          }
        }

        updated++;
      } catch (error: any) {
        const articleId = item.articleId?.toString().trim() || 'unknown';
        errors.push(`Error processing ${articleId}: ${error.message || 'Unknown error'}`);
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Bulk description update completed', {
      endpoint: 'POST /api/admin/items/bulk-update-descriptions',
      updated,
      notFound,
      errorCount: errors.length,
      duration,
    });

    return NextResponse.json({
      message: `Successfully updated descriptions for ${updated} items`,
      results: {
        updated,
        notFound,
        errors: errors.length,
      },
      details: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (error) {
    const req = new NextRequest(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/items/bulk-update-descriptions`);
    return apiErrorHandler(error, req, {
      endpoint: 'POST /api/admin/items/bulk-update-descriptions',
      duration: Date.now() - startTime,
    });
  }
}
