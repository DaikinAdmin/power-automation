import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'pl';
    const vatPct = parseFloat(searchParams.get('vat') ?? '23');
    const validatedVat = Number.isFinite(vatPct) && vatPct >= 0 && vatPct <= 100 ? vatPct : 23;
    const vatMultiplier = 1 + validatedVat / 100;

    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Fetch ALL items regardless of isDisplayed status
    const items = await db.select().from(schema.item);

    if (items.length === 0) return NextResponse.json([]);

    const itemSlugs = items.map((i) => i.slug);

    // Fetch details for this locale only (LEFT JOIN semantics — missing = empty)
    const itemDetails = await db
      .select()
      .from(schema.itemDetails)
      .where(
        inArray(schema.itemDetails.itemSlug, itemSlugs)
      );

    // Fetch all prices for these items
    const itemPrices = await db
      .select()
      .from(schema.itemPrice)
      .where(inArray(schema.itemPrice.itemSlug, itemSlugs));

    // Fetch warehouses
    const warehouseIds = [...new Set(itemPrices.map((p) => p.warehouseId))];
    const warehouses = warehouseIds.length > 0
      ? await db.select().from(schema.warehouse).where(inArray(schema.warehouse.id, warehouseIds))
      : [];

    // Build lookup maps for O(1) access
    const detailsBySlug = new Map(
      itemDetails
        .filter((d) => d.locale === locale)
        .map((d) => [d.itemSlug, d])
    );
    const pricesBySlug = new Map<string, typeof itemPrices>();
    for (const price of itemPrices) {
      if (!pricesBySlug.has(price.itemSlug)) pricesBySlug.set(price.itemSlug, []);
      pricesBySlug.get(price.itemSlug)!.push(price);
    }
    const warehouseById = new Map(warehouses.map((w) => [w.id, w]));

    const result = items.map((item) => {
      const detail = detailsBySlug.get(item.slug);
      const prices = pricesBySlug.get(item.slug) ?? [];

      return {
        articleId: item.articleId,
        slug: item.slug,
        isDisplayed: item.isDisplayed,
        sellCounter: item.sellCounter,
        categorySlug: item.categorySlug,
        brandSlug: item.brandSlug,
        warrantyType: item.warrantyType,
        warrantyLength: item.warrantyLength,
        createdAt: item.createdAt || '',
        updatedAt: item.updatedAt || '',
        details: {
          locale,
          itemName: detail?.itemName ?? '',
          description: detail?.description ?? '',
          specifications: detail?.specifications ?? '',
          seller: detail?.seller ?? '',
          discount: detail?.discount ?? null,
          popularity: detail?.popularity ?? null,
          metaKeyWords: detail?.metaKeyWords ?? '',
          metaDescription: detail?.metaDescription ?? '',
        },
        prices: prices.map((price) => {
          const warehouse = warehouseById.get(price.warehouseId);
          return {
            warehouseSlug: price.warehouseId,
            priceWithoutVAT: price.price,
            priceWithVAT: Math.round(price.price * vatMultiplier * 100) / 100,
            initialPrice: price.initialPrice ?? 0,
            initialPriceCurrency: price.initialCurrency ?? '',
            quantity: price.quantity,
            promotionPrice: price.promotionPrice,
            badge: price.badge || '',
            margin: price.margin ?? 20,
            warehouse: {
              displayedName: warehouse?.displayedName || '',
              name: warehouse?.name || '',
            },
          };
        }),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error exporting items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
