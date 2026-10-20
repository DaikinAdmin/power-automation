import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getVisibleWarehouseIds } from '@/helpers/db/warehouse-visibility';
import { isPromoActive } from '@/helpers/pricing';
import type { CartItemType } from '@/helpers/types/item';

type CartWarehouse = NonNullable<CartItemType['availableWarehouses']>[number];

const MAX_ARTICLE_IDS = 100;

/**
 * Public, unauthenticated live stock and price per visible warehouse for the
 * articles in a client cart. The cart lives in localStorage, so its
 * quantities and prices are a snapshot from when each item was added — this
 * lets the cart drop sold-out lines, cap quantities at what is left and offer
 * other warehouses before checkout (/api/orders rejects insufficient stock
 * anyway). Price and promo rules mirror orderHandler, so the cart shows what
 * the order will actually charge. Warehouses hidden on the requesting domain
 * are left out, same as at order time.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const articleIds: string[] = Array.isArray(body?.articleIds)
      ? Array.from(
          new Set<string>(
            body.articleIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          )
        )
      : [];

    // Refuse instead of truncating: the cart treats an article missing from
    // the response as no longer available and would drop it.
    if (articleIds.length > MAX_ARTICLE_IDS) {
      return NextResponse.json({ error: `At most ${MAX_ARTICLE_IDS} articles per request` }, { status: 400 });
    }

    const items: Record<string, CartWarehouse[]> = {};

    const domainKey = getDomainKeyByHost(request.headers.get('host'));
    const visibleWarehouseIds = articleIds.length > 0 ? await getVisibleWarehouseIds(domainKey) : [];

    if (visibleWarehouseIds.length > 0) {
      const rows = await db
        .select({
          articleId: schema.item.articleId,
          warehouseId: schema.itemPrice.warehouseId,
          price: schema.itemPrice.price,
          promotionPrice: schema.itemPrice.promotionPrice,
          promoStartDate: schema.itemPrice.promoStartDate,
          promoEndDate: schema.itemPrice.promoEndDate,
          quantity: schema.itemPrice.quantity,
          initialCurrency: schema.itemPrice.initialCurrency,
          warehouseName: schema.warehouse.name,
          warehouseDisplayedName: schema.warehouse.displayedName,
          warehouseCountry: schema.warehouse.countrySlug,
        })
        .from(schema.itemPrice)
        .innerJoin(schema.item, eq(schema.item.slug, schema.itemPrice.itemSlug))
        .innerJoin(schema.warehouse, eq(schema.warehouse.id, schema.itemPrice.warehouseId))
        .where(
          and(
            inArray(schema.item.articleId, articleIds),
            inArray(schema.itemPrice.warehouseId, visibleWarehouseIds)
          )
        );

      for (const row of rows) {
        const specialPrice =
          row.promotionPrice != null && isPromoActive(row.promoStartDate, row.promoEndDate)
            ? row.promotionPrice
            : undefined;

        (items[row.articleId] ??= []).push({
          warehouseId: row.warehouseId,
          warehouseName: row.warehouseName || row.warehouseDisplayedName,
          warehouseCountry: row.warehouseCountry || '',
          displayName: row.warehouseDisplayedName || undefined,
          price: row.price,
          specialPrice,
          basePrice: row.price,
          baseSpecialPrice: specialPrice,
          inStock: row.quantity > 0,
          quantity: row.quantity,
          initialCurrency: row.initialCurrency ?? null,
        });
      }
    }

    const response = NextResponse.json({ items });
    // Stock changes with every order — never serve it from a cache.
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Error fetching cart stock:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
