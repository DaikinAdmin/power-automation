import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, inArray, desc, and } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { getTranslations } from 'next-intl/server';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getDeliveryPricingByDomainKey, computeDeliveryCharge } from '@/lib/delivery-pricing';
import { sendNewOrderEmails, type OrderEmailData } from '@/lib/order-emails';
import { isPromoActive } from '@/helpers/pricing';
import { getVisibleWarehouseIds } from '@/helpers/db/warehouse-visibility';

export type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  // Catalog slug, needed to re-look-up itemPrice rows for warehouse
  // reassignment / re-costing. Never exposed to customers (see
  // mapLineItemForCustomer below).
  itemSlug?: string | null;
  // Stored financial fields
  originalCurrency?: string | null;
  vatRate?: number | null;
  exchangeRate?: number | null;
  basePriceNet?: number | null;
  specialPriceNet?: number | null;
  unitPriceNet?: number | null;
  // Cost-basis snapshot (admin/analytics only — NEVER sent to customers).
  // costPriceNet is in the same currency basis as unitPriceNet
  // (originalCurrency), so it goes through the same exchangeRate as the
  // selling price when converting to the order's payment currency.
  costPriceNet?: number | null;
  costMarginPercent?: number | null;
  // Derived fields (computed in API, not stored in DB)
  unitPriceGrossConverted?: number | null;
  lineTotalNet?: number | null;
  lineTotalNetConverted?: number | null;
  lineVatConverted?: number | null;
  lineTotalGrossConverted?: number | null;
  // Derived profit fields — null means "unavailable" (missing cost snapshot,
  // e.g. an order placed before this field existed, or a catalog row with no
  // initialPrice), never rendered/treated as 0.
  lineProfitNetConverted?: number | null;
  lineProfitMarginPercent?: number | null;
};

export function computeLineItemDerived(item: OrderLineItem): OrderLineItem {
  const unitPriceNet = item.unitPriceNet ?? 0;
  const exchangeRate = item.exchangeRate ?? 1;
  const vatRate = item.vatRate ?? 0;
  const quantity = item.quantity ?? 1;
  const lineTotalNet = +(unitPriceNet * quantity).toFixed(6);
  const lineTotalNetConverted = +(lineTotalNet * exchangeRate).toFixed(2);
  const lineVatConverted = +(lineTotalNetConverted * vatRate).toFixed(2);
  const lineTotalGrossConverted = +(lineTotalNetConverted + lineVatConverted).toFixed(2);
  // Compute unit gross via the same rounding path as line total (not directly from raw net)
  // to avoid 1-cent discrepancy when quantity = 1
  const unitPriceNetConverted = +(unitPriceNet * exchangeRate).toFixed(2);
  const unitVatConverted = +(unitPriceNetConverted * vatRate).toFixed(2);
  const unitPriceGrossConverted = +(unitPriceNetConverted + unitVatConverted).toFixed(2);

  const hasCost = item.costPriceNet != null;
  const costTotalNetConverted = hasCost
    ? +((item.costPriceNet as number) * quantity * exchangeRate).toFixed(2)
    : null;
  const lineProfitNetConverted = hasCost
    ? +(lineTotalNetConverted - (costTotalNetConverted as number)).toFixed(2)
    : null;
  const lineProfitMarginPercent =
    hasCost && lineTotalNetConverted > 0
      ? +(((lineProfitNetConverted as number) / lineTotalNetConverted) * 100).toFixed(2)
      : null;

  return {
    ...item,
    lineTotalNet,
    lineTotalNetConverted,
    lineVatConverted,
    lineTotalGrossConverted,
    unitPriceGrossConverted,
    lineProfitNetConverted,
    lineProfitMarginPercent,
  };
}

// Fields safe to return to the customer who owns the order. Deliberately
// excludes itemSlug/costPriceNet/costMarginPercent/lineProfit* — cost and
// profit data must never leave the admin/employee-only API surface.
const CUSTOMER_SAFE_LINE_ITEM_FIELDS = [
  'itemId',
  'articleId',
  'name',
  'quantity',
  'warehouseId',
  'warehouseName',
  'warehouseDisplayedName',
  'warehouseCountry',
  'originalCurrency',
  'vatRate',
  'exchangeRate',
  'basePriceNet',
  'specialPriceNet',
  'unitPriceNet',
  'unitPriceGrossConverted',
  'lineTotalNet',
  'lineTotalNetConverted',
  'lineVatConverted',
  'lineTotalGrossConverted',
] as const;

export function mapLineItemForCustomer(item: OrderLineItem): Partial<OrderLineItem> {
  const derived = computeLineItemDerived(item);
  const safe: Record<string, unknown> = {};
  for (const key of CUSTOMER_SAFE_LINE_ITEM_FIELDS) {
    safe[key] = (derived as any)[key];
  }
  return safe as Partial<OrderLineItem>;
}

export const parseStoredLineItems = (value: unknown): OrderLineItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is OrderLineItem => typeof item === 'object' && item !== null) as OrderLineItem[];
};

export function mapOrderForUser(order: any) {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency ?? null,
    totalNet: order.totalNet ?? null,
    totalVat: order.totalVat ?? null,
    totalGross: order.totalGross ?? null,
    discountAmount: order.discountAmount ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryId: order.deliveryId,
    delivery: order.delivery ?? null,
    payment: order.payment ?? null,
    lineItems: Array.isArray(order.lineItems)
      ? (order.lineItems as OrderLineItem[]).map(mapLineItemForCustomer)
      : [],
  };
}

// Resolves a currency conversion rate using the currency_exchange table
// (all rates are quoted against EUR as the base). Shared by checkout and by
// the admin order-editing actions (warehouse reassignment / price override)
// so both paths derive rates identically.
export async function buildRateResolver(): Promise<(src: string, dst: string) => number> {
  const allRateRows = await db
    .select({ from: schema.currencyExchange.from, to: schema.currencyExchange.to, rate: schema.currencyExchange.rate })
    .from(schema.currencyExchange);

  const rateTable = new Map<string, Map<string, number>>();
  for (const r of allRateRows) {
    if (!rateTable.has(r.from)) rateTable.set(r.from, new Map());
    rateTable.get(r.from)!.set(r.to, r.rate);
  }

  return (src: string, dst: string): number => {
    if (src === dst) return 1;
    const BASE = 'EUR';
    const srcToBase = src === BASE ? 1 : (rateTable.get(BASE)?.get(src) ?? null);
    const baseToDs = dst === BASE ? 1 : (rateTable.get(BASE)?.get(dst) ?? null);
    if (srcToBase != null && baseToDs != null && srcToBase !== 0) {
      return (1 / srcToBase) * baseToDs;
    }
    const direct = rateTable.get(src)?.get(dst);
    if (direct != null) return direct;
    const dstToSrc = rateTable.get(dst)?.get(src);
    if (dstToSrc != null && dstToSrc !== 0) return 1 / dstToSrc;
    return 1;
  };
}

export type RefreshLineItemCostResult =
  | { ok: true; item: OrderLineItem; warning?: string }
  | { ok: false; reason: 'not_found' };

// Re-derives a line item's cost snapshot (and, when targetWarehouseId is
// given and differs from the current one, its warehouse identity/display
// fields) from the CURRENT itemPrice catalog row — used by admin order
// editing (warehouse reassignment, price override) where profit must always
// reflect live cost data, unlike the selling price which stays frozen.
// Returns { ok: false, reason: 'not_found' } when the target warehouse has
// no itemPrice row at all for this item (can't be priced/costed there) —
// callers should block the edit in that case.
export async function refreshLineItemCost(
  item: OrderLineItem,
  targetWarehouseId?: string,
  resolveRate?: (src: string, dst: string) => number,
): Promise<RefreshLineItemCostResult> {
  // Orders placed before the itemSlug field existed don't carry it on the
  // line item — fall back to resolving it from itemId (always present,
  // since it's the item table's own primary key), so warehouse reassignment
  // and price overrides work on every order, not just ones created after
  // that field was added. The resolved slug is written back below so the
  // order self-heals the first time it's edited.
  let itemSlug = item.itemSlug ?? null;
  if (!itemSlug) {
    const [itemRow] = await db
      .select({ slug: schema.item.slug })
      .from(schema.item)
      .where(eq(schema.item.id, item.itemId))
      .limit(1);
    itemSlug = itemRow?.slug ?? null;
  }
  if (!itemSlug) {
    return { ok: false, reason: 'not_found' };
  }
  const warehouseId = targetWarehouseId ?? item.warehouseId;

  const [row] = await db
    .select({
      quantity: schema.itemPrice.quantity,
      margin: schema.itemPrice.margin,
      initialPrice: schema.itemPrice.initialPrice,
      initialCurrency: schema.itemPrice.initialCurrency,
      warehouse: schema.warehouse,
    })
    .from(schema.itemPrice)
    .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
    .where(and(eq(schema.itemPrice.itemSlug, itemSlug), eq(schema.itemPrice.warehouseId, warehouseId)))
    .limit(1);

  if (!row || !row.warehouse) {
    return { ok: false, reason: 'not_found' };
  }

  const resolve = resolveRate ?? (await buildRateResolver());
  // costPriceNet must stay in the same currency basis as unitPriceNet
  // (item.originalCurrency) so computeLineItemDerived's exchangeRate applies
  // to it identically — the selling-price basis never changes on a
  // warehouse swap, only which catalog row backs the cost figure.
  const targetCurrency = item.originalCurrency ?? row.initialCurrency ?? null;
  const costPriceNet =
    row.initialPrice != null
      ? +(
          row.initialCurrency && targetCurrency && row.initialCurrency !== targetCurrency
            ? row.initialPrice * resolve(row.initialCurrency, targetCurrency)
            : row.initialPrice
        ).toFixed(6)
      : null;

  const updated: OrderLineItem = {
    ...item,
    itemSlug,
    warehouseId: row.warehouse.id,
    warehouseName: row.warehouse.name ?? row.warehouse.displayedName ?? item.warehouseName ?? null,
    warehouseDisplayedName: row.warehouse.displayedName ?? item.warehouseDisplayedName ?? null,
    warehouseCountry: row.warehouse.countrySlug ?? item.warehouseCountry ?? null,
    costPriceNet,
    costMarginPercent: row.margin ?? null,
  };

  const warning = row.quantity === 0 ? 'Target warehouse has zero stock for this item.' : undefined;
  return { ok: true, item: updated, warning };
}

// Sums totals across all lines the same way checkout does, for use after an
// admin edits a line item's price (warehouse reassignment never changes
// selling-price fields, so it never needs this).
export function recomputeOrderTotalsFromLineItems(lineItems: OrderLineItem[]): {
  totalNet: number;
  totalVat: number;
  totalGross: number;
} {
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;
  for (const li of lineItems) {
    const derived = computeLineItemDerived(li);
    totalNet += derived.lineTotalNetConverted ?? 0;
    totalVat += derived.lineVatConverted ?? 0;
    totalGross += derived.lineTotalGrossConverted ?? 0;
  }
  return {
    totalNet: +totalNet.toFixed(2),
    totalVat: +totalVat.toFixed(2),
    totalGross: +totalGross.toFixed(2),
  };
}

export async function orderHandler(body: any, userId: string, locale: string = 'en', host: string | null = null) {
  const t = await getTranslations({ locale, namespace: 'errors' });
  
  const {
    cartItems,
    customerInfo,
    deliveryId,
    novaPost,
    deliveryPoland,
    domainCurrency: orderCurrency = 'EUR',
    comment,
    orderMethod,
    gaClientId: bodyGaClientId,
    adVisitorId,
  } = body;

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json(
      { error: 'Cart is empty' },
      { status: 400 }
    );
  }

  const itemIds = cartItems
    .map((item: any) => item.articleId || item.productId)
    .filter((id: string | undefined | null) => Boolean(id)) as string[];

  if (itemIds.length !== cartItems.length) {
    return NextResponse.json(
      { error: 'Each cart item must include an articleId' },
      { status: 400 }
    );
  }

  // Resolve domain + visible warehouses up front — a cart line pointing at a
  // warehouse hidden on this domain must be rejected the same way as one
  // pointing at a non-existent warehouse, not silently honored.
  const domainKey = getDomainKeyByHost(host);
  const visibleWarehouseIds = await getVisibleWarehouseIds(domainKey);

  const dbItems = await db
    .select()
    .from(schema.item)
    .where(inArray(schema.item.articleId, itemIds));

  const dbItemsWithRelations = await Promise.all(
    dbItems.map(async (item) => {
      const [itemDetails, itemPrices] = await Promise.all([
        db.select({ itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
          .from(schema.itemDetails)
          .where(eq(schema.itemDetails.itemSlug, item.slug))
          .limit(1),
        visibleWarehouseIds.length > 0
          ? db.select({
              id: schema.itemPrice.id,
              itemSlug: schema.itemPrice.itemSlug,
              warehouseId: schema.itemPrice.warehouseId,
              price: schema.itemPrice.price,
              quantity: schema.itemPrice.quantity,
              promotionPrice: schema.itemPrice.promotionPrice,
              promoStartDate: schema.itemPrice.promoStartDate,
              promoEndDate: schema.itemPrice.promoEndDate,
              margin: schema.itemPrice.margin,
              initialPrice: schema.itemPrice.initialPrice,
              initialCurrency: schema.itemPrice.initialCurrency,
              warehouse: schema.warehouse,
            })
              .from(schema.itemPrice)
              .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
              .where(
                and(
                  eq(schema.itemPrice.itemSlug, item.slug),
                  // Only prices tied to warehouses visible on this domain —
                  // a cart carrying a hidden warehouseId must not be orderable.
                  inArray(schema.itemPrice.warehouseId, visibleWarehouseIds)
                )
              )
          : Promise.resolve([]),
      ]);

      return {
        ...item,
        itemDetails,
        itemPrice: itemPrices,
      };
    })
  );

  const resolveRate = await buildRateResolver();

  const [domainVatRow] = await db
    .select({ vatPercentage: schema.warehouseCountries.vatPercentage })
    .from(schema.warehouseCountries)
    .where(eq(schema.warehouseCountries.slug, domainKey))
    .limit(1);
  const domainVatRate = (domainVatRow?.vatPercentage ?? 0) / 100;

  let totalNetAcc = 0;
  let totalVatAcc = 0;
  const orderLineItems: any[] = [];

  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItemsWithRelations.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (!dbItem) {
      return NextResponse.json(
        { error: t('itemNotFound', { articleId: cartArticleId }) },
        { status: 404 }
      );
    }

    const itemPrice = dbItem.itemPrice.find(
      (price: { warehouse: any }) => price.warehouse?.id === cartItem.warehouseId
    );

    if (!itemPrice) {
      logger.warn('Warehouse not found for cart item', {
        cartItemWarehouseId: cartItem.warehouseId,
        availableWarehouses: dbItem.itemPrice.map((p: any) => ({
          id: p.warehouse?.id,
          name: p.warehouse?.name
        }))
      });
    }

    if (!itemPrice || !itemPrice.warehouse) {
      return NextResponse.json(
        { error: t('itemNotAvailable', { itemName: cartItem.name }) },
        { status: 400 }
      );
    }

    if (itemPrice.quantity < cartItem.quantity) {
      return NextResponse.json(
        { error: t('insufficientStock', { itemName: cartItem.name, available: itemPrice.quantity, requested: cartItem.quantity }) },
        { status: 400 }
      );
    }

    const originalCurrency = cartItem.currency || (itemPrice as any).initialCurrency || null;
    const exchangeRate = originalCurrency ? resolveRate(originalCurrency, orderCurrency) : 1;
    const vatRate = domainVatRate;
    const basePriceNet = itemPrice.price;

    // Cost-of-goods snapshot, frozen at order time (admin/analytics only —
    // stripped from every customer-facing response by mapLineItemForCustomer).
    const costInitialPrice = (itemPrice as any).initialPrice ?? null;
    const costInitialCurrency = (itemPrice as any).initialCurrency ?? null;
    const costPriceNet =
      costInitialPrice != null
        ? +(
            costInitialCurrency && costInitialCurrency !== originalCurrency
              ? costInitialPrice * resolveRate(costInitialCurrency, originalCurrency)
              : costInitialPrice
          ).toFixed(6)
        : null;
    const costMarginPercent = itemPrice.margin ?? null;
    const specialPriceNet =
      itemPrice.promotionPrice != null &&
      isPromoActive(itemPrice.promoStartDate, itemPrice.promoEndDate)
        ? itemPrice.promotionPrice
        : null;
    const unitPriceNet = specialPriceNet ?? basePriceNet;
    const lineTotalNet = +(unitPriceNet * cartItem.quantity).toFixed(6);
    const lineTotalNetConverted = +(lineTotalNet * exchangeRate).toFixed(2);
    const lineVatConverted = +(lineTotalNetConverted * vatRate).toFixed(2);

    totalNetAcc += lineTotalNetConverted;
    totalVatAcc += lineVatConverted;

    orderLineItems.push({
      itemId: dbItem.id,
      articleId: cartArticleId,
      itemSlug: dbItem.slug,
      name:
        cartItem.name ||
        dbItem.itemDetails?.[0]?.itemName ||
        dbItem.brandSlug ||
        cartArticleId,
      quantity: cartItem.quantity,
      warehouseId: itemPrice.warehouse.id,
      warehouseName: itemPrice.warehouse.name ?? itemPrice.warehouse.displayedName ?? 'Unknown warehouse',
      warehouseDisplayedName: itemPrice.warehouse.displayedName,
      warehouseCountry: itemPrice.warehouse.countrySlug,
      originalCurrency,
      vatRate,
      exchangeRate,
      basePriceNet,
      specialPriceNet,
      unitPriceNet,
      costPriceNet,
      costMarginPercent,
    });
  }

  const totalNet = +totalNetAcc.toFixed(2);
  const totalVat = +totalVatAcc.toFixed(2);
  const deliveryPricing = getDeliveryPricingByDomainKey(domainKey);
  const plDeliveryCharge = computeDeliveryCharge(deliveryPricing, deliveryPoland?.method, totalNet + totalVat);
  const totalGross = +(totalNet + totalVat + plDeliveryCharge).toFixed(2);

  let resolvedDeliveryId: string | null = deliveryId || null;
  let deliverySummary: { type: string; address: string | null; paymentMethod: string | null } | null = null;
  if (novaPost?.method) {
    const deliveryTypeMap: Record<string, 'PICKUP_UA' | 'WAREHOUSE_NOVA_POSHTA' | 'COURIER_NOVA_POSHTA'> = {
      warehouse: 'PICKUP_UA',
      nova_dept: 'WAREHOUSE_NOVA_POSHTA',
      nova_courier: 'COURIER_NOVA_POSHTA',
    };
    const mappedType = deliveryTypeMap[novaPost.method] ?? 'PICKUP_UA';
    const now = new Date().toISOString();
    const [newDelivery] = await db
      .insert(schema.delivery)
      .values({
        id: crypto.randomUUID(),
        userId,
        type: mappedType,
        city: novaPost.city ?? null,
        cityRef: novaPost.cityRef ?? null,
        warehouseRef: novaPost.warehouseRef ?? null,
        warehouseDesc: novaPost.warehouseDesc ?? null,
        street: novaPost.street ?? null,
        building: novaPost.building ?? null,
        flat: novaPost.flat ?? null,
        paymentMethod: novaPost.payment ?? null,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    resolvedDeliveryId = newDelivery.id;
    deliverySummary = {
      type: newDelivery.type,
      address:
        newDelivery.warehouseDesc ||
        [newDelivery.street, newDelivery.building, newDelivery.flat].filter(Boolean).join(', ') ||
        newDelivery.city ||
        null,
      paymentMethod: newDelivery.paymentMethod,
    };
  }

  if (deliveryPoland?.method) {
    const plTypeMap: Record<string, 'PARCEL_LOCKER_INPOST' | 'COURIER_INPOST' | 'PICKUP_PL' | 'PARCEL_LOCKER_DPD'> = {
      parcel_locker_inpost: 'PARCEL_LOCKER_INPOST',
      courier_inpost: 'COURIER_INPOST',
      pickup: 'PICKUP_PL',
      dpd_parcel: 'PARCEL_LOCKER_DPD',
    };
    const mappedPlType = plTypeMap[deliveryPoland.method] ?? 'PARCEL_LOCKER_INPOST';
    const plDeliveryPrice = plDeliveryCharge;
    const now = new Date().toISOString();
    const [newPlDelivery] = await db
      .insert(schema.delivery)
      .values({
        id: crypto.randomUUID(),
        userId,
        type: mappedPlType,
        city: deliveryPoland.city ?? deliveryPoland.pointCity ?? null,
        warehouseRef: deliveryPoland.dpdPointId ?? deliveryPoland.pointName ?? null,
        warehouseDesc: deliveryPoland.dpdPointId ?? deliveryPoland.pointName ?? null,
        street: deliveryPoland.street ?? deliveryPoland.pointStreet ?? null,
        building: deliveryPoland.building ?? deliveryPoland.pointBuilding ?? null,
        flat: deliveryPoland.flat ?? null,
        paymentMethod: deliveryPoland.payment ?? null,
        deliveryPrice: plDeliveryPrice,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    resolvedDeliveryId = newPlDelivery.id;
    deliverySummary = {
      type: newPlDelivery.type,
      address:
        newPlDelivery.warehouseDesc ||
        [newPlDelivery.street, newPlDelivery.building, newPlDelivery.flat].filter(Boolean).join(', ') ||
        newPlDelivery.city ||
        null,
      paymentMethod: newPlDelivery.paymentMethod,
    };
  }

  // Resolve Google Ads attribution captured on landing (see ad-click-tracker.tsx)
  // so it survives on the order even if the customer never completes an
  // online-card payment right away — a payment link generated later (e.g. by
  // an admin) can still carry correct purchase-conversion attribution.
  let resolvedGclid: string | null = null;
  let resolvedGaClientId: string | null = bodyGaClientId || null;
  if (adVisitorId) {
    const [adClickRow] = await db
      .select({ gclid: schema.adClick.gclid, gaClientId: schema.adClick.gaClientId })
      .from(schema.adClick)
      .where(eq(schema.adClick.visitorId, adVisitorId))
      .orderBy(desc(schema.adClick.createdAt))
      .limit(1);
    if (adClickRow) {
      resolvedGclid = adClickRow.gclid;
      resolvedGaClientId = resolvedGaClientId || adClickRow.gaClientId;
    }
  }

  const now = new Date().toISOString();
  const [order] = await db
    .insert(schema.order)
    .values({
      id: crypto.randomUUID(),
      userId: userId,
      currency: orderCurrency,
      totalNet,
      totalVat,
      totalGross,
      lineItems: orderLineItems,
      status: 'NEW',
      deliveryId: resolvedDeliveryId,
      comment: comment || null,
      locale,
      orderMethod: orderMethod === 'QUICK' ? 'QUICK' : 'ACCOUNT',
      gclid: resolvedGclid,
      gaClientId: resolvedGaClientId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (resolvedDeliveryId && !deliveryId) {
    await db
      .update(schema.delivery)
      .set({ orderId: order.id, updatedAt: now })
      .where(eq(schema.delivery.id, resolvedDeliveryId));
  }

  try {
    const [orderUser] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (orderUser) {
      const emailData: OrderEmailData = {
        orderId: order.id,
        orderShortId: order.id.substring(0, 8),
        customerName: orderUser.name,
        customerEmail: orderUser.email,
        customerPhone: orderUser.countryCode + orderUser.phoneNumber || undefined,
        companyName: orderUser.companyName || undefined,
        totalGross: order.totalGross,
        currency: order.currency,
        locale,
        deliveryType: deliverySummary?.type,
        deliveryAddress: deliverySummary?.address ?? undefined,
        paymentMethod: deliverySummary?.paymentMethod ?? undefined,
        lineItems: orderLineItems.map((li: any) => {
          const derived = computeLineItemDerived(li);
          return {
            name: li.name || li.articleId,
            articleId: li.articleId,
            quantity: li.quantity,
            unitPriceGross: derived.unitPriceGrossConverted,
            lineTotalGrossConverted: derived.lineTotalGrossConverted,
            warehouseName: li.warehouseName,
          };
        }),
        comment: order.comment,
      };
      sendNewOrderEmails(emailData);
    }
  } catch (emailErr) {
    logger.error('Failed to send order notification emails', { orderId: order.id, error: String(emailErr) });
  }

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      status: order.status,
      currency: order.currency,
      totalNet: order.totalNet,
      totalVat: order.totalVat,
      totalGross: order.totalGross,
      lineItems: Array.isArray(order.lineItems)
        ? (order.lineItems as OrderLineItem[]).map(mapLineItemForCustomer)
        : order.lineItems,
      createdAt: order.createdAt
    }
  });
}