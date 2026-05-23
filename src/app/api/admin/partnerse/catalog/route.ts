import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Currency } from '@/db/schema';
import { auth } from '@/lib/auth';
import { isUserAdmin } from '@/helpers/db/queries';
import { apiErrorHandler, UnauthorizedError, ForbiddenError } from '@/lib/error-handler';

const WAREHOUSE_ID = 'warehouse-schneider';

async function fetchPartnerseCatalog(refs: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
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

  const data = await response.json();

  if (!response.ok) {
    return { ok: false, error: typeof data === 'object' && data !== null && 'error' in data ? String((data as Record<string, unknown>).error) : `HTTP ${response.status}` };
  }

  return { ok: true, data };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError('Authentication required');
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) throw new ForbiddenError('Admin access required');
  } catch (e) {
    return apiErrorHandler(e);
  }

  const rows = await db
    .select({ articleId: schema.item.articleId })
    .from(schema.item)
    .where(eq(schema.item.brandSlug, 'schneider-electric'));

  const refs = rows.map((r) => r.articleId).join(',');

  if (!refs) {
    return NextResponse.json({ error: 'No schneider-electric items found in DB' }, { status: 400 });
  }

  const result = await fetchPartnerseCatalog(refs);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json(result.data);
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new UnauthorizedError('Authentication required');
    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) throw new ForbiddenError('Admin access required');
  } catch (e) {
    return apiErrorHandler(e);
  }

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

  let discount = 35;
  let newItemMargin = 25;
  let updateExistingMargin = false;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.discount === 'number') discount = body.discount;
    if (typeof body.margin === 'number') newItemMargin = body.margin;
    if (typeof body.updateExistingMargin === 'boolean') updateExistingMargin = body.updateExistingMargin;
  } catch {
    // use defaults
  }

  const refs = rows.map((r) => r.articleId).join(',');
  const result = await fetchPartnerseCatalog(refs);
  // console.log('Partnerse catalog update result:', result);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const itemByArticleId = new Map(rows.map((r) => [r.articleId, { id: r.id, slug: r.slug }]));
  const now = new Date().toISOString();

  let updated = 0;
  let created = 0;

  const catalogItems = Array.isArray(result.data)
    ? result.data
    : Array.isArray((result.data as Record<string, unknown>)?.data)
      ? (result.data as Record<string, unknown>).data as unknown[]
      : [];

  if (catalogItems.length === 0) {
    return NextResponse.json({ error: 'No items returned from Partnerse', raw: result.data }, { status: 502 });
  }

  const dbRefs = [...itemByArticleId.keys()].slice(0, 5);
  const apiArticles = (catalogItems as Array<{ article: string }>).slice(0, 5).map(i => i.article);
  console.log('DB articleIds (first 5):', dbRefs);
  console.log('Partnerse articles (first 5):', apiArticles);
  const matchCount = (catalogItems as Array<{ article: string }>).filter(i => itemByArticleId.has(i.article)).length;
  console.log(`Matched ${matchCount} of ${catalogItems.length} Partnerse items to DB`);

  for (const catalogItem of catalogItems as Array<{
    article: string;
    price: string | number;
    currency: string;
    total_warehouse: number;
  }>) {
    const item = itemByArticleId.get(catalogItem.article);
    if (!item) continue;
    const price = typeof catalogItem.price === 'string' ? parseFloat(catalogItem.price) : catalogItem.price;

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
      const effectiveMargin = updateExistingMargin ? newItemMargin : (existing.margin ?? 0);
      const priceExVat = price / 1.2;
      const priceAfterDiscount = Math.round(priceExVat * (1 - discount / 100) * 100) / 100;
      const calculatedPrice = Math.round(priceAfterDiscount * (1 + effectiveMargin / 100) * 100) / 100;
      const quantityChanged = existing.quantity !== catalogItem.total_warehouse;
      const priceChanged = existing.initialPrice !== priceAfterDiscount;
      const marginChanged = updateExistingMargin && existing.margin !== newItemMargin;

      if (priceChanged || marginChanged) {
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
          .set({
            price: calculatedPrice,
            initialPrice: priceAfterDiscount,
            initialCurrency: catalogItem.currency as Currency,
            quantity: catalogItem.total_warehouse,
            ...(updateExistingMargin ? { margin: newItemMargin } : {}),
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, existing.id));
      } else if (quantityChanged) {
        await db
          .update(schema.itemPrice)
          .set({ quantity: catalogItem.total_warehouse, updatedAt: now })
          .where(eq(schema.itemPrice.id, existing.id));
      }
      updated++;
    } else {
      const priceExVat = price / 1.2;
      const priceAfterDiscount = Math.round(priceExVat * (1 - discount / 100) * 100) / 100;
      const calculatedPrice = Math.round(priceAfterDiscount * (1 + newItemMargin / 100) * 100) / 100;
      await db.insert(schema.itemPrice).values({
        itemSlug: item.slug,
        warehouseId: WAREHOUSE_ID,
        price: calculatedPrice,
        quantity: catalogItem.total_warehouse,
        initialPrice: priceAfterDiscount,
        initialCurrency: catalogItem.currency as Currency,
        margin: newItemMargin,
        updatedAt: now,
      });
      created++;
    }
  }

  return NextResponse.json({ updated, created });
}
