import { NextResponse } from 'next/server';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Currency } from '@/db/schema';

const WAREHOUSE_ID = 'warehouse-schneider';

async function fetchPartnerseCatalog(refs: string) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Accept', 'application/json');
  headers.append('api_key', process.env.PARTNERSE_TOKEN ?? '');

  const response = await fetch('https://partnerse.pro/catalog/', {
    method: 'POST',
    headers,
    body: JSON.stringify({ whb: true, refs }),
    cache: 'no-store',
  });

  return response.json();
}

export async function GET() {
  const rows = await db
    .select({ articleId: schema.item.articleId })
    .from(schema.item)
    .where(eq(schema.item.brandSlug, 'schneider-electric'));

  const refs = rows.map((r) => r.articleId).join(',');

  if (!refs) {
    return NextResponse.json({ error: 'No schneider-electric items found in DB' }, { status: 400 });
  }

  const data = await fetchPartnerseCatalog(refs);
  return NextResponse.json(data);
}

export async function PUT() {
  const rows = await db
    .select({ id: schema.item.id, articleId: schema.item.articleId, slug: schema.item.slug })
    .from(schema.item)
    .where(
      and(
        eq(schema.item.brandSlug, 'schneider-electric'),
        eq(schema.item.isDisplayed, true)
      )
    );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No displayed schneider-electric items found in DB' }, { status: 400 });
  }

  const refs = rows.map((r) => r.articleId).join(',');
  const result = await fetchPartnerseCatalog(refs);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const itemByArticleId = new Map(rows.map((r) => [r.articleId, { id: r.id, slug: r.slug }]));
  const now = new Date().toISOString();

  let updated = 0;
  let created = 0;

  for (const catalogItem of result.data as Array<{
    ref: string;
    price: number;
    currency: string;
    total_warehouse: number;
  }>) {
    const item = itemByArticleId.get(catalogItem.ref);
    if (!item) continue;

    const [existing] = await db
      .select()
      .from(schema.itemPrice)
      .where(
        and(
          eq(schema.itemPrice.itemSlug, item.slug),
          eq(schema.itemPrice.warehouseId, WAREHOUSE_ID)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.price !== catalogItem.price) {
        await db.insert(schema.itemPriceHistory).values({
          itemId: item.id,
          warehouseId: existing.warehouseId,
          price: existing.price,
          quantity: existing.quantity,
          promotionPrice: existing.promotionPrice,
          promoCode: existing.promoCode,
          promoStartDate: existing.promoStartDate,
          promoEndDate: existing.promoEndDate,
          margin: existing.margin,
          badge: existing.badge,
          initialPrice: existing.initialPrice,
          initialCurrency: existing.initialCurrency,
        });

        await db
          .update(schema.itemPrice)
          .set({ price: catalogItem.price, quantity: catalogItem.total_warehouse, updatedAt: now })
          .where(eq(schema.itemPrice.id, existing.id));
      } else {
        await db
          .update(schema.itemPrice)
          .set({ quantity: catalogItem.total_warehouse, updatedAt: now })
          .where(eq(schema.itemPrice.id, existing.id));
      }
      updated++;
    } else {
      await db.insert(schema.itemPrice).values({
        warehouseId: WAREHOUSE_ID,
        itemSlug: item.slug,
        price: catalogItem.price,
        quantity: catalogItem.total_warehouse,
        initialPrice: catalogItem.price,
        initialCurrency: catalogItem.currency as Currency,
        updatedAt: now,
      });
      created++;
    }
  }

  return NextResponse.json({ updated, created });
}
