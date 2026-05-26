import { NextResponse } from 'next/server';
import { db } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { getTranslations } from 'next-intl/server';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getDeliveryPricingByDomainKey, computeDeliveryCharge } from '@/lib/delivery-pricing';
import { sendNewOrderEmails, type OrderEmailData } from '@/lib/order-emails';

export type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  // Stored financial fields
  originalCurrency?: string | null;
  vatRate?: number | null;
  exchangeRate?: number | null;
  basePriceNet?: number | null;
  specialPriceNet?: number | null;
  unitPriceNet?: number | null;
  // Derived fields (computed in API, not stored in DB)
  unitPriceGrossConverted?: number | null;
  lineTotalNet?: number | null;
  lineTotalNetConverted?: number | null;
  lineVatConverted?: number | null;
  lineTotalGrossConverted?: number | null;
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
  return { ...item, lineTotalNet, lineTotalNetConverted, lineVatConverted, lineTotalGrossConverted, unitPriceGrossConverted };
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
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryId: order.deliveryId,
    delivery: order.delivery ?? null,
    payment: order.payment ?? null,
    lineItems: Array.isArray(order.lineItems)
      ? (order.lineItems as OrderLineItem[]).map(computeLineItemDerived)
      : [],
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
        db.select({
          id: schema.itemPrice.id,
          itemSlug: schema.itemPrice.itemSlug,
          warehouseId: schema.itemPrice.warehouseId,
          price: schema.itemPrice.price,
          quantity: schema.itemPrice.quantity,
          promotionPrice: schema.itemPrice.promotionPrice,
          margin: schema.itemPrice.margin,
          initialCurrency: schema.itemPrice.initialCurrency,
          warehouse: schema.warehouse,
        })
          .from(schema.itemPrice)
          .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
          .where(eq(schema.itemPrice.itemSlug, item.slug)),
      ]);

      return {
        ...item,
        itemDetails,
        itemPrice: itemPrices,
      };
    })
  );

  const domainKey = getDomainKeyByHost(host);
  const allRateRows = await db
    .select({ from: schema.currencyExchange.from, to: schema.currencyExchange.to, rate: schema.currencyExchange.rate })
    .from(schema.currencyExchange);

  const rateTable = new Map<string, Map<string, number>>();
  for (const r of allRateRows) {
    if (!rateTable.has(r.from)) rateTable.set(r.from, new Map());
    rateTable.get(r.from)!.set(r.to, r.rate);
  }

  const resolveRate = (src: string, dst: string): number => {
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
    const specialPriceNet = itemPrice.promotionPrice ?? null;
    const unitPriceNet = specialPriceNet ?? basePriceNet;
    const lineTotalNet = +(unitPriceNet * cartItem.quantity).toFixed(6);
    const lineTotalNetConverted = +(lineTotalNet * exchangeRate).toFixed(2);
    const lineVatConverted = +(lineTotalNetConverted * vatRate).toFixed(2);

    totalNetAcc += lineTotalNetConverted;
    totalVatAcc += lineVatConverted;

    orderLineItems.push({
      itemId: dbItem.id,
      articleId: cartArticleId,
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
    });
  }

  const totalNet = +totalNetAcc.toFixed(2);
  const totalVat = +totalVatAcc.toFixed(2);
  const deliveryPricing = getDeliveryPricingByDomainKey(domainKey);
  const plDeliveryCharge = computeDeliveryCharge(deliveryPricing, deliveryPoland?.method, totalNet + totalVat);
  const totalGross = +(totalNet + totalVat + plDeliveryCharge).toFixed(2);

  let resolvedDeliveryId: string | null = deliveryId || null;
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
      notes: { locale },
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

  for (const cartItem of cartItems) {
    const cartArticleId = cartItem.articleId || cartItem.productId;
    const dbItem = dbItemsWithRelations.find((item: { articleId: string }) => item.articleId === cartArticleId);
    if (dbItem) {
      const [currentPrice] = await db
        .select()
        .from(schema.itemPrice)
        .where(eq(schema.itemPrice.itemSlug, dbItem.articleId))
        .limit(1);

      if (currentPrice) {
        await db
          .update(schema.itemPrice)
          .set({
            quantity: currentPrice.quantity - cartItem.quantity,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, currentPrice.id));
      }
    }
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
        comment: null,
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
        ? (order.lineItems as any[]).map(computeLineItemDerived)
        : order.lineItems,
      createdAt: order.createdAt
    }
  });
}