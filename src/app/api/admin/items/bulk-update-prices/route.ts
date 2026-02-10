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
  price: number;
  quantity: number;
  currency?: string;
  badge?: string;
  brand?: string;
  promoCode?: string;
  promoPrice?: number;
  promoStartDate?: string;
  promoEndDate?: string;
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
        if (!item.articleId) {
          errors.push('Missing articleId in row');
          continue;
        }

        // Find the item by articleId
        let dbItem = await db
          .select()
          .from(schema.item)
          .where(eq(schema.item.articleId, item.articleId))
          .limit(1);

        // If item not found, create it
        if (dbItem.length === 0) {
          const slug = 'unknown_' + item.articleId.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
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
          
          // Create the item
          const [newItem] = await db
            .insert(schema.item)
            .values({
              articleId: item.articleId,
              slug,
              isDisplayed: false,
              brandSlug,
              categorySlug: 'uncategorized',
              updatedAt: new Date().toISOString(),
            })
            .returning();
          
          // Create item details for default locale
          await db
            .insert(schema.itemDetails)
            .values({
              itemSlug: slug,
              itemName: item.articleId,
              description: item.articleId,
              locale: 'pl',
            });
          
          dbItem = [newItem];
        }

        const itemId = dbItem[0].id;
        const itemSlug = dbItem[0].slug;

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
          await db
            .update(schema.itemPrice)
            .set({
              price: item.price,
              quantity: item.quantity,
              badge: (item.badge as any) || 'ABSENT',
              promoCode: item.promoCode || null,
              promotionPrice: item.promoPrice || null,
              promoStartDate: item.promoStartDate || null,
              promoEndDate: item.promoEndDate || null,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.itemPrice.id, oldPrice.id));
          
          updated++;
        } else {
          // Create new price record
          await db
            .insert(schema.itemPrice)
            .values({
              itemSlug,
              warehouseId,
              price: item.price,
              quantity: item.quantity,
              badge: (item.badge as any) || 'ABSENT',
              promoCode: item.promoCode || null,
              promotionPrice: item.promoPrice || null,
              promoStartDate: item.promoStartDate || null,
              promoEndDate: item.promoEndDate || null,
              updatedAt: new Date().toISOString(),
            });
          
          created++;
        }
      } catch (error: any) {
        logger.error('Error processing item', {
          articleId: item.articleId,
          error: error.message,
        });
        errors.push(`Error processing ${item.articleId}: ${error.message}`);
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
