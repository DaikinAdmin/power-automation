import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, or, like, and } from 'drizzle-orm';
import * as schema from '@/db/schema';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ items: [], categories: [], subCategories: [] });
  }

  try {
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    
    // Search items by articleId (case-insensitive)
    const itemsByArticleId = await db
      .select()
      .from(schema.item)
      .where(
        and(
          like(schema.item.articleId, searchTerm),
          eq(schema.item.isDisplayed, true)
        )
      );

    // Search items by itemName in details
    const itemsByName = await db
      .selectDistinct({
        id: schema.item.id,
        articleId: schema.item.articleId,
        isDisplayed: schema.item.isDisplayed,
        sellCounter: schema.item.sellCounter,
        itemImageLink: schema.item.itemImageLink,
        brandSlug: schema.item.brandSlug,
        categorySlug: schema.item.categorySlug,
        warrantyType: schema.item.warrantyType,
        warrantyLength: schema.item.warrantyLength,
        linkedItems: schema.item.linkedItems,
        createdAt: schema.item.createdAt,
        updatedAt: schema.item.updatedAt,
      })
      .from(schema.item)
      .innerJoin(schema.itemDetails, eq(schema.itemDetails.itemSlug, schema.item.articleId))
      .where(
        and(
          like(schema.itemDetails.itemName, searchTerm),
          eq(schema.item.isDisplayed, true)
        )
      );

    // Merge results and remove duplicates
    const uniqueItems = Array.from(
      new Map(
        [...itemsByArticleId, ...itemsByName].map(item => [item.id, item])
      ).values()
    );

    // Fetch related data for each item
    const itemsWithDetails = await Promise.all(
      uniqueItems.map(async (item) => {
        const [itemDetails, itemPrices, category, subCategory, brand] = await Promise.all([
          db.select().from(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, item.articleId)),
          db.select({
            id: schema.itemPrice.id,
            itemSlug: schema.itemPrice.itemSlug,
            warehouseId: schema.itemPrice.warehouseId,
            price: schema.itemPrice.price,
            quantity: schema.itemPrice.quantity,
            promotionPrice: schema.itemPrice.promotionPrice,
            promoEndDate: schema.itemPrice.promoEndDate,
            promoCode: schema.itemPrice.promoCode,
            badge: schema.itemPrice.badge,
            createdAt: schema.itemPrice.createdAt,
            updatedAt: schema.itemPrice.updatedAt,
            warehouse: schema.warehouse,
          })
            .from(schema.itemPrice)
            .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
            .where(eq(schema.itemPrice.itemSlug, item.articleId)),
          item.categorySlug
            ? db.select().from(schema.category).where(eq(schema.category.slug, item.categorySlug)).limit(1).then(r => r[0])
            : null,
          item.categorySlug
            ? db.select().from(schema.subcategories).where(eq(schema.subcategories.slug, item.categorySlug)).limit(1).then(r => r[0])
            : null,
          item.brandSlug
            ? db.select().from(schema.brand).where(eq(schema.brand.alias, item.brandSlug)).limit(1).then(r => r[0])
            : null,
        ]);

        return {
          ...item,
          itemDetails,
          itemPrice: itemPrices,
          category,
          subCategory,
          brand,
        };
      })
    );

    /* Prisma implementation (commented out)
    const items = await db.item.findMany({
      where: {
        OR: [
          {
            articleId: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            itemDetails: {
              some: {
                itemName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          }
        ],
        isDisplayed: true
      },
      include: {
        itemDetails: true,
        category: true,
        subCategory: true,
        brand: true,
        itemPrice: {
          include: {
            warehouse: true
          }
        }
      }
    });
    */

    return NextResponse.json(itemsWithDetails);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
