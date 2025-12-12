// Query helpers for items list endpoint
import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { ItemListResponse } from '@/helpers/types/api-responses';

export async function getItemsByLocale(locale: string): Promise<ItemListResponse[]> {
  // Get displayed items
  const items = await db
    .select({
      articleId: schema.item.articleId,
      itemImageLink: schema.item.itemImageLink,
      brandSlug: schema.item.brandSlug,
      categorySlug: schema.item.categorySlug,
    })
    .from(schema.item)
    .where(eq(schema.item.isDisplayed, true))
    .orderBy(desc(schema.item.createdAt));

  if (items.length === 0) return [];

  // Get all article IDs
  const articleIds = items.map((i) => i.articleId);

  // Fetch item details for the locale
  const itemDetails = await db
    .select()
    .from(schema.itemDetails)
    .where(
      and(
        sql`${schema.itemDetails.itemSlug} = ANY(${articleIds})`,
        eq(schema.itemDetails.locale, locale)
      )
    );

  // Fetch prices
  const itemPrices = await db
    .select()
    .from(schema.itemPrice)
    .where(sql`${schema.itemPrice.itemSlug} = ANY(${articleIds})`);

  // Fetch brands
  const brandSlugs = [...new Set(items.map((i) => i.brandSlug).filter(Boolean))];
  const brands = await db
    .select()
    .from(schema.brand)
    .where(sql`${schema.brand.alias} = ANY(${brandSlugs})`);

  // Fetch warehouses
  const warehouseIds = [...new Set(itemPrices.map((p) => p.warehouseId))];
  const warehouses = await db
    .select()
    .from(schema.warehouse)
    .where(sql`${schema.warehouse.id} = ANY(${warehouseIds})`);

  // Map results
  const mapped = items.map((item) => {
    const detail = itemDetails.find((d) => d.itemSlug === item.articleId);
    // Get the first available price (preferably with stock)
    const prices = itemPrices.filter((p) => p.itemSlug === item.articleId);
    const priceWithStock = prices.find((p) => p.quantity > 0) || prices[0];
    
    const brand = brands.find((b) => b.alias === item.brandSlug);
    const warehouse = warehouses.find((w) => w.id === priceWithStock?.warehouseId);

    if (!detail || !priceWithStock) {
      // Skip items without details or pricing
      return null;
    }

    return {
      articleId: item.articleId,
      itemName: detail.itemName,
      description: detail.description,
      itemImageLink: item.itemImageLink || [],
      brandSlug: item.brandSlug,
      brandName: brand?.name || null,
      categorySlug: item.categorySlug,
      price: priceWithStock.price,
      promotionPrice: priceWithStock.promotionPrice,
      quantity: priceWithStock.quantity,
      badge: priceWithStock.badge,
      warehouseSlug: warehouse?.id || '',
    } as ItemListResponse;
  });

  return mapped.filter((item): item is ItemListResponse => item !== null);
}
