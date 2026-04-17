import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/error-handler';

interface BulkUpdateItem {
  articleId: string;
  initialPrice?: number;
  price?: number;
  quantity?: number;
  currency?: string;
  badge?: string;
  brand?: string;
  promoCode?: string;
  promoPrice?: number;
  promoStartDate?: string;
  promoEndDate?: string;
  margin?: number;
  seller?: string;
  imageUrl?: string;
  alias?: string;
  isDisplayed?: boolean;
  translations?: Record<string, { name?: string; description?: string; specifications?: string; metaDescription?: string; metaKeywords?: string }>;
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
    const { items, warehouseId } = body as { items: BulkUpdateItem[], warehouseId: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items array is required');
    }

    if (!warehouseId) {
      throw new BadRequestError('Warehouse ID is required');
    }

    logger.info('Starting bulk price update', {
      endpoint: 'POST /api/admin/items/bulk-update-prices',
      itemCount: items.length,
      warehouseId,
    });

    // Verify warehouse exists
    const warehouse = await db
      .select()
      .from(schema.warehouse)
      .where(eq(schema.warehouse.id, warehouseId))
      .limit(1);

    if (warehouse.length === 0) {
      throw new BadRequestError('Warehouse not found');
    }

    let updated = 0;
    let created = 0;
    let notFound = 0;
    const errors: string[] = [];

    // Process each item
    for (const item of items) {
      try {
        // Trim articleId to remove whitespace
        const articleId = item.articleId?.toString().trim();
        
        if (!articleId) {
          errors.push('Missing articleId in row');
          continue;
        }

        // Find the item by articleId
        let dbItem = await db
          .select()
          .from(schema.item)
          .where(eq(schema.item.articleId, articleId))
          .limit(1);

        // If item not found, create it
        if (dbItem.length === 0) {
          const slug = 'unknown_' + articleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // Check if brand exists
          let brandSlug = 'unknown';
          if (item.brand) {
            const brandResult = await db
              .select({ alias: schema.brand.alias })
              .from(schema.brand)
              .where(eq(schema.brand.name, item.brand))
              .limit(1);
            
            if (brandResult.length > 0) {
              brandSlug = brandResult[0].alias;
            }
          }
          
          // Get a default category (use first available category)
          const defaultCategory = await db
            .select({ slug: schema.category.slug })
            .from(schema.category)
            .limit(1);
          
          if (defaultCategory.length === 0) {
            errors.push(`No categories found in database. Cannot create item ${articleId}`);
            continue;
          }
          
          // Create the item
          const [newItem] = await db
            .insert(schema.item)
            .values({
              articleId,
              slug,
              isDisplayed: item.isDisplayed ?? false,
              brandSlug,
              categorySlug: 'uncategorized',
              alias: item.alias || null,
              itemImageLink: item.imageUrl
                ? item.imageUrl.split(',').map((u: string) => u.trim()).filter(Boolean)
                : null,
              updatedAt: new Date().toISOString(),
            })
            .returning();
          
          // Create item details for default locale
          await db
            .insert(schema.itemDetails)
            .values({
              itemSlug: slug,
              itemName: articleId,
              description: articleId,
              locale: 'pl',
              seller: item.seller || null,
            });
          
          dbItem = [newItem];
        }

        const itemId = dbItem[0].id;
        const itemSlug = dbItem[0].slug;

        // Update item-level fields if provided
        const itemFieldsUpdate: Record<string, any> = {};
        if (item.imageUrl !== undefined) {
          itemFieldsUpdate.itemImageLink = item.imageUrl.split(',').map((u: string) => u.trim()).filter(Boolean);
        }
        if (item.alias !== undefined) itemFieldsUpdate.alias = item.alias;
        if (item.isDisplayed !== undefined) itemFieldsUpdate.isDisplayed = item.isDisplayed;
        if (Object.keys(itemFieldsUpdate).length > 0) {
          itemFieldsUpdate.updatedAt = new Date().toISOString();
          await db.update(schema.item).set(itemFieldsUpdate).where(eq(schema.item.slug, itemSlug));
        }
        if (item.seller !== undefined) {
          await db.update(schema.itemDetails)
            .set({ seller: item.seller })
            .where(eq(schema.itemDetails.itemSlug, itemSlug));
        }

        // Check if itemPrice already exists for this item and warehouse
        const existingPrice = await db
          .select()
          .from(schema.itemPrice)
          .where(
            and(
              eq(schema.itemPrice.itemSlug, itemSlug),
              eq(schema.itemPrice.warehouseId, warehouseId)
            )
          )
          .limit(1);

        if (existingPrice.length > 0) {
          // Save old price to history before updating
          const oldPrice = existingPrice[0];
          
          // Insert into item_price_history
          const [historyRecord] = await db
            .insert(schema.itemPriceHistory)
            .values({
              itemId,
              warehouseId,
              price: oldPrice.price,
              quantity: oldPrice.quantity,
              promotionPrice: oldPrice.promotionPrice,
              promoCode: oldPrice.promoCode,
              promoStartDate: oldPrice.promoStartDate,
              promoEndDate: oldPrice.promoEndDate,
              badge: oldPrice.badge || 'ABSENT',
              margin: oldPrice.margin ?? 20,
              initialPrice: oldPrice.initialPrice,
              initialCurrency: oldPrice.initialCurrency,
            })
            .returning();

          // Create relationship in join table
          await db
            .insert(schema.itemPriceToItemPriceHistory)
            .values({
              a: oldPrice.id, // itemPrice.id
              b: historyRecord.id, // itemPriceHistory.id
            });

          // Update existing price with new values
          let newPrice: number;
          let newInitialPrice: number | null;
          let newMargin: number;
          let newInitialCurrency: string | null;

          if (item.initialPrice !== undefined && item.initialPrice !== null) {
            const effectiveMargin = item.margin ?? oldPrice.margin ?? 20;
            newPrice = Math.round(item.initialPrice * (1 + effectiveMargin / 100) * 100) / 100;
            newInitialPrice = item.initialPrice;
            newMargin = effectiveMargin;
            newInitialCurrency = (item.currency as any) || oldPrice.initialCurrency || null;
          } else {
            // Preserve existing price/margin/currency — only badge/quantity/promo changed
            newPrice = oldPrice.price;
            newInitialPrice = oldPrice.initialPrice ?? null;
            newMargin = oldPrice.margin ?? 20;
            newInitialCurrency = oldPrice.initialCurrency ?? null;
          }

          const priceUpdateFields: Record<string, any> = {
            price: newPrice,
            initialPrice: newInitialPrice,
            margin: newMargin,
            initialCurrency: newInitialCurrency as any,
            quantity: item.quantity !== undefined ? item.quantity : oldPrice.quantity,
            badge: (item.badge as any) || 'ABSENT',
            updatedAt: new Date().toISOString(),
          };
          if (item.promoCode !== undefined) priceUpdateFields.promoCode = item.promoCode || null;
          if (item.promoPrice !== undefined) priceUpdateFields.promotionPrice = item.promoPrice || null;
          if (item.promoStartDate !== undefined) priceUpdateFields.promoStartDate = item.promoStartDate || null;
          if (item.promoEndDate !== undefined) priceUpdateFields.promoEndDate = item.promoEndDate || null;

          await db
            .update(schema.itemPrice)
            .set(priceUpdateFields)
            .where(eq(schema.itemPrice.id, oldPrice.id));
          
          updated++;
        } else {
          // Create new price record
          const effectiveMargin = item.margin ?? 20;
          const calculatedPrice = item.initialPrice != null
            ? Math.round(item.initialPrice * (1 + effectiveMargin / 100) * 100) / 100
            : Math.round((item.price ?? 0) * 100) / 100;
          await db
            .insert(schema.itemPrice)
            .values({
              itemSlug,
              warehouseId,
              price: calculatedPrice,
              initialPrice: item.initialPrice,
              quantity: item.quantity ?? 0,
              badge: (item.badge as any) || 'ABSENT',
              promoCode: item.promoCode || null,
              promotionPrice: item.promoPrice || null,
              promoStartDate: item.promoStartDate || null,
              promoEndDate: item.promoEndDate || null,
              margin: effectiveMargin,
              initialCurrency: (item.currency as any) || null,
              updatedAt: new Date().toISOString(),
            });
          
          created++;
        }

        // Process translations if provided
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
                });
            }
          }
        }
      } catch (error: any) {
        const articleId = item.articleId?.toString().trim() || 'unknown';
        const errorMsg = error.cause?.message || error.message || 'Unknown error';
        
        logger.error('Error processing item', {
          articleId,
          error: errorMsg,
          stack: error.stack,
        });
        errors.push(`Error processing ${articleId}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('Bulk price update completed', {
      endpoint: 'POST /api/admin/items/bulk-update-prices',
      updated,
      created,
      notFound,
      errorCount: errors.length,
      duration,
    });

    return NextResponse.json({
      message: `Successfully processed ${updated + created} items`,
      results: {
        updated,
        created,
        notFound,
        errors: errors.length,
      },
      details: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
    });

  } catch (error) {
    const req = new NextRequest(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/items/bulk-update-prices`);
    return apiErrorHandler(error, req, { 
      endpoint: 'POST /api/admin/items/bulk-update-prices',
      duration: Date.now() - startTime,
    });
  }
}
