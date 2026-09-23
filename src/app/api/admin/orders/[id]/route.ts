import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@/db/schema";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq, inArray, desc, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  computeLineItemDerived,
  refreshLineItemCost,
  recomputeOrderTotalsFromLineItems,
  buildRateResolver,
  OrderLineItem,
} from "@/app/api/orders/shared";
import { ORDER_STATUS_OPTIONS } from "@/constants/order";
import { isWarehouseVisibleOnDomain } from "@/helpers/db/warehouse-visibility";
import { isPromoActive } from "@/helpers/pricing";
import type { DomainKey } from "@/lib/domain-config";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);

// JSON value type
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const parseLineItems = (value: JsonValue | null): OrderLineItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is OrderLineItem =>
        typeof item === "object" && item !== null,
    ) as OrderLineItem[];
  }
  return [];
};

// Orders don't carry an explicit domain — it's derived from the payment
// currency, same mapping used everywhere else (see getDomainKeyByHost).
const domainKeyFromCurrency = (currency: string | null): DomainKey =>
  currency === "UAH" ? "ua" : "pl";

// A line is identified by (itemId, warehouseId), not itemId alone — the same
// item can appear as two separate lines when sourced from different
// warehouses (different price/stock/lead time), e.g. one line kept at its
// original warehouse and a second added later from a different one. All
// line-targeting actions below must match on both fields, never itemId
// alone, or they'd hit the wrong line (or, for remove, delete every line for
// that item) once an order has more than one line per item.
const findLineIndex = (lineItems: OrderLineItem[], itemId: string, warehouseId: string): number =>
  lineItems.findIndex((li) => li.itemId === itemId && li.warehouseId === warehouseId);

type OrderNoteEntry = { id: string; text: string; createdAt: string };

const appendAuditNote = (
  notes: unknown,
  actorLabel: string,
  text: string,
): OrderNoteEntry[] => {
  const existing = Array.isArray(notes) ? (notes as OrderNoteEntry[]) : [];
  return [
    ...existing,
    {
      id: crypto.randomUUID(),
      text: `[${actorLabel}] ${text}`,
      createdAt: new Date().toISOString(),
    },
  ];
};

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, role: user.role };
}

const mapOrder = (order: any) => {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency ?? null,
    totalNet: order.totalNet ?? null,
    totalVat: order.totalVat ?? null,
    totalGross: order.totalGross ?? null,
    deliveryId: order.deliveryId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    user: order.user,
    lineItems: Array.isArray(order.lineItems)
      ? order.lineItems.map(computeLineItemDerived)
      : order.lineItems,
    comment: order.comment,
    notes: order.notes ?? null,
    discountAmount: order.discountAmount ?? null,
    orderMethod: order.orderMethod ?? null,
    gclid: order.gclid ?? null,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    const { id } = await params;

    // Drizzle implementation
    const [orderData] = await db
      .select({
        id: schema.order.id,
        status: schema.order.status,
        currency: schema.order.currency,
        totalNet: schema.order.totalNet,
        totalVat: schema.order.totalVat,
        totalGross: schema.order.totalGross,
        lineItems: schema.order.lineItems,
        createdAt: schema.order.createdAt,
        comment: schema.order.comment,
        notes: schema.order.notes,
        discountAmount: schema.order.discountAmount,
        orderMethod: schema.order.orderMethod,
        gclid: schema.order.gclid,
        deliveryId: schema.order.deliveryId,
        updatedAt: schema.order.updatedAt,
        userName: schema.user.name,
        userPhoneNumber: schema.user.phoneNumber,
        userCountryCode: schema.user.countryCode,
        userEmail: schema.user.email,
        userVatNumber: schema.user.vatNumber,
        userCompanyName: schema.user.companyName,
        userType: schema.user.userType,
        userAddressLine: schema.user.addressLine,
      })
      .from(schema.order)
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id))
      .where(eq(schema.order.id, id))
      .limit(1);

    if (!orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch items with details
    let items: any[] = [];
    const lineItems = parseLineItems(orderData.lineItems as JsonValue | null);
    const itemIds = lineItems.map((li) => li.itemId).filter(Boolean);
    if (itemIds.length > 0) {
      const itemsData = await db
        .select()
        .from(schema.item)
        .where(inArray(schema.item.id, itemIds));

      items = await Promise.all(
        itemsData.map(async (item) => {
          const [itemDetail] = await db
            .select({ itemName: schema.itemDetails.itemName })
            .from(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, item.articleId))
            .limit(1);

          const [priceData] = await db
            .select({
              id: schema.itemPrice.id,
              price: schema.itemPrice.price,
              warehouse: schema.warehouse,
            })
            .from(schema.itemPrice)
            .leftJoin(
              schema.warehouse,
              eq(schema.itemPrice.warehouseId, schema.warehouse.id),
            )
            .where(eq(schema.itemPrice.itemSlug, item.articleId))
            .limit(1);

          return {
            id: item.id,
            itemDetails: itemDetail ? [itemDetail] : [],
            itemPrice: priceData ? [priceData] : [],
          };
        }),
      );
    }

    const order = {
      id: orderData.id,
      status: orderData.status,
      currency: orderData.currency,
      totalNet: orderData.totalNet,
      totalVat: orderData.totalVat,
      totalGross: orderData.totalGross,
      lineItems: orderData.lineItems,
      createdAt: orderData.createdAt,
      comment: orderData.comment,
      notes: orderData.notes,
      discountAmount: orderData.discountAmount,
      orderMethod: orderData.orderMethod,
      gclid: orderData.gclid,
      deliveryId: orderData.deliveryId,
      updatedAt: orderData.updatedAt,
      user: {
        name: orderData.userName,
        phoneNumber: orderData.userPhoneNumber,
        countryCode: orderData.userCountryCode,
        email: orderData.userEmail,
        vatNumber: orderData.userVatNumber,
        companyName: orderData.userCompanyName,
        userType: orderData.userType,
        addressLine: orderData.userAddressLine,
      },
      items,
    };

    // Fetch linked delivery record if present
    let deliveryRecord = null;
    if (orderData.deliveryId) {
      const [dr] = await db
        .select()
        .from(schema.delivery)
        .where(eq(schema.delivery.id, orderData.deliveryId))
        .limit(1);
      deliveryRecord = dr ?? null;
    }
    // Also check delivery by orderId (in case linkage only goes one way)
    if (!deliveryRecord) {
      const [dr] = await db
        .select()
        .from(schema.delivery)
        .where(eq(schema.delivery.orderId, id))
        .limit(1);
      deliveryRecord = dr ?? null;
    }

    // Fetch linked payment record if present
    const [paymentRecord] = await db
      .select({
        id: schema.payment.id,
        status: schema.payment.status,
        currency: schema.payment.currency,
        amount: schema.payment.amount,
        paymentMethod: schema.payment.paymentMethod,
        sessionId: schema.payment.sessionId,
        transactionId: schema.payment.transactionId,
        merchantId: schema.payment.merchantId,
        updatedAt: schema.payment.updatedAt,
      })
      .from(schema.payment)
      .where(eq(schema.payment.orderId, id))
      .orderBy(desc(schema.payment.updatedAt)) // Сортуємо від найновішого до найстарішого
      .limit(1); // Забираємо лише перший (тобто найновіший) запис

    const paymentData = paymentRecord;

    return NextResponse.json({
      order: mapOrder(order),
      delivery: deliveryRecord,
      payment: paymentData,
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    const { id } = await params;
    const body = await request.json();

    // Handle notes update action
    if (body.action === "updateNotes") {
      const { notes } = body as { notes: unknown };
      if (!Array.isArray(notes)) {
        return NextResponse.json(
          { error: "Invalid notes format" },
          { status: 400 },
        );
      }
      const sanitized = notes
        .map((n: any) => ({
          id: typeof n.id === "string" ? n.id.slice(0, 64) : "",
          text: typeof n.text === "string" ? n.text.slice(0, 2000) : "",
          createdAt:
            typeof n.createdAt === "string"
              ? n.createdAt
              : new Date().toISOString(),
        }))
        .filter((n) => n.id && n.text);
      const [updated] = await db
        .update(schema.order)
        .set({ notes: sanitized, updatedAt: new Date().toISOString() })
        .where(eq(schema.order.id, id))
        .returning({ notes: schema.order.notes });
      if (!updated) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ notes: updated.notes });
    }

    // Handle discount update action (UA/LiqPay orders only — see
    // getOrderPayableAmount() in src/lib/liqpay.ts for where this is applied)
    if (body.action === "setDiscount") {
      const { discountAmount } = body as { discountAmount: unknown };
      if (
        discountAmount !== null &&
        (typeof discountAmount !== "number" || !Number.isFinite(discountAmount) || discountAmount < 0)
      ) {
        return NextResponse.json(
          { error: "Invalid discount amount" },
          { status: 400 },
        );
      }
      const [existing] = await db
        .select({ totalGross: schema.order.totalGross })
        .from(schema.order)
        .where(eq(schema.order.id, id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      if (discountAmount !== null && discountAmount > existing.totalGross) {
        return NextResponse.json(
          { error: "Discount cannot exceed the order total" },
          { status: 400 },
        );
      }
      const [updated] = await db
        .update(schema.order)
        .set({ discountAmount, updatedAt: new Date().toISOString() })
        .where(eq(schema.order.id, id))
        .returning({ discountAmount: schema.order.discountAmount });
      return NextResponse.json({ discountAmount: updated.discountAmount });
    }

    // Force-majeure warehouse reassignment for a single line item. Selling
    // price stays exactly as the customer was charged — only warehouse
    // identity/display fields and the (admin-only) cost snapshot change.
    if (body.action === "reassignLineItemWarehouse") {
      const { itemId, warehouseId, targetWarehouseId, reason } = body as {
        itemId?: string;
        warehouseId?: string;
        targetWarehouseId?: string;
        reason?: string;
      };
      if (
        !itemId ||
        typeof itemId !== "string" ||
        !warehouseId ||
        typeof warehouseId !== "string" ||
        !targetWarehouseId ||
        typeof targetWarehouseId !== "string"
      ) {
        return NextResponse.json(
          { error: "itemId, warehouseId and targetWarehouseId are required" },
          { status: 400 },
        );
      }

      const [existing] = await db
        .select({
          lineItems: schema.order.lineItems,
          notes: schema.order.notes,
          currency: schema.order.currency,
        })
        .from(schema.order)
        .where(eq(schema.order.id, id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const lineItems = parseLineItems(existing.lineItems as JsonValue | null);
      const lineIndex = findLineIndex(lineItems, itemId, warehouseId);
      if (lineIndex === -1) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 });
      }
      const line = lineItems[lineIndex];

      // This item may already have a separate line at the target warehouse
      // (e.g. added independently via "add item", at its own price) —
      // reassigning into that slot would silently overwrite/collide with it,
      // and there's no safe way to merge two lines that may carry different
      // prices. Block instead and let the admin resolve it explicitly
      // (remove one of the lines first).
      if (findLineIndex(lineItems, itemId, targetWarehouseId) !== -1) {
        return NextResponse.json(
          {
            error:
              "This item already has a separate line at that warehouse — remove or adjust it manually instead of reassigning.",
          },
          { status: 400 },
        );
      }

      const result = await refreshLineItemCost(line, targetWarehouseId);
      if (!result.ok) {
        return NextResponse.json(
          {
            error:
              "Could not resolve pricing for this item at the target warehouse — either the item no longer exists in the catalog, or that warehouse doesn't carry it (no price entry)",
          },
          { status: 400 },
        );
      }

      const warnings: string[] = [];
      if (result.warning) warnings.push(result.warning);

      const domainKey = domainKeyFromCurrency(existing.currency);
      const visible = await isWarehouseVisibleOnDomain(targetWarehouseId, domainKey);
      if (!visible) {
        warnings.push(
          "Target warehouse is not normally visible on this order's storefront domain.",
        );
      }

      const oldWarehouseLabel =
        line.warehouseDisplayedName || line.warehouseName || line.warehouseId;
      const newWarehouseLabel =
        result.item.warehouseDisplayedName || result.item.warehouseName || targetWarehouseId;

      const updatedLineItems = [...lineItems];
      updatedLineItems[lineIndex] = result.item;

      const actorLabel =
        authResult.session.user.email ?? authResult.session.user.name ?? authResult.role;
      const updatedNotes = appendAuditNote(
        existing.notes,
        actorLabel,
        `Warehouse reassignment: "${line.name}" ${oldWarehouseLabel} → ${newWarehouseLabel}${reason ? ` — ${reason}` : ""}`,
      );

      await db
        .update(schema.order)
        .set({
          lineItems: updatedLineItems,
          notes: updatedNotes,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.order.id, id));

      return NextResponse.json({
        lineItems: updatedLineItems.map(computeLineItemDerived),
        notes: updatedNotes,
        warnings,
      });
    }

    // Manual price override for a single line item. The admin enters the
    // price the way it's displayed everywhere else in this UI — gross
    // (VAT-included), in the order's own payment currency — not the
    // internal net storage figure. It's converted back to unitPriceNet
    // (net, in the line's original currency) using the line's own
    // vatRate/exchangeRate, which this action never changes. Cost/profit are
    // re-derived from the current catalog (not frozen), since the sale price
    // itself is changing — unlike a warehouse reassignment, which keeps
    // price frozen.
    if (body.action === "setLineItemPrice") {
      const { itemId, warehouseId, unitPriceGross, reason } = body as {
        itemId?: string;
        warehouseId?: string;
        unitPriceGross?: unknown;
        reason?: string;
      };
      if (
        !itemId ||
        typeof itemId !== "string" ||
        !warehouseId ||
        typeof warehouseId !== "string" ||
        typeof unitPriceGross !== "number" ||
        !Number.isFinite(unitPriceGross) ||
        unitPriceGross < 0
      ) {
        return NextResponse.json(
          { error: "itemId, warehouseId and a valid unitPriceGross are required" },
          { status: 400 },
        );
      }
      if (!reason || typeof reason !== "string" || !reason.trim()) {
        return NextResponse.json(
          { error: "A reason is required for a manual price override" },
          { status: 400 },
        );
      }

      const [existing] = await db
        .select({
          lineItems: schema.order.lineItems,
          notes: schema.order.notes,
        })
        .from(schema.order)
        .where(eq(schema.order.id, id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const lineItems = parseLineItems(existing.lineItems as JsonValue | null);
      const lineIndex = findLineIndex(lineItems, itemId, warehouseId);
      if (lineIndex === -1) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 });
      }
      const line = lineItems[lineIndex];
      const oldGross = computeLineItemDerived(line).unitPriceGrossConverted ?? null;

      // Convert the admin-entered gross/order-currency price back to
      // net/original-currency for storage, using this line's own (unchanged)
      // vatRate/exchangeRate.
      const vatRate = line.vatRate ?? 0;
      const exchangeRate = line.exchangeRate && line.exchangeRate !== 0 ? line.exchangeRate : 1;
      const unitPriceNet = +(unitPriceGross / (1 + vatRate) / exchangeRate).toFixed(6);

      // Re-cost at the line's current warehouse. If the catalog no longer has
      // a price row there, keep cost as "unavailable" rather than blocking
      // the price override itself.
      const costResult = await refreshLineItemCost(line);
      const baseLine = costResult.ok ? costResult.item : line;
      const updatedLine: OrderLineItem = { ...baseLine, unitPriceNet };

      const updatedLineItems = [...lineItems];
      updatedLineItems[lineIndex] = updatedLine;

      const totals = recomputeOrderTotalsFromLineItems(updatedLineItems);

      const warnings: string[] = [];
      const [paymentRow] = await db
        .select({ status: schema.payment.status })
        .from(schema.payment)
        .where(eq(schema.payment.orderId, id))
        .orderBy(desc(schema.payment.updatedAt))
        .limit(1);
      if (paymentRow?.status && paymentRow.status !== "PENDING") {
        warnings.push(
          "Order already has a captured payment — reconcile the charged amount manually.",
        );
      }

      const actorLabel =
        authResult.session.user.email ?? authResult.session.user.name ?? authResult.role;
      const updatedNotes = appendAuditNote(
        existing.notes,
        actorLabel,
        `Price override: "${line.name}" ${oldGross ?? "—"} → ${unitPriceGross} (gross) — ${reason}`,
      );

      await db
        .update(schema.order)
        .set({
          lineItems: updatedLineItems,
          notes: updatedNotes,
          totalNet: totals.totalNet,
          totalVat: totals.totalVat,
          totalGross: totals.totalGross,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.order.id, id));

      return NextResponse.json({
        lineItems: updatedLineItems.map(computeLineItemDerived),
        notes: updatedNotes,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
        warnings,
      });
    }

    // Add a line item to the order — the admin-editing counterpart of the
    // storefront cart. If the item is already on the order FROM THE SAME
    // WAREHOUSE, this increases its quantity rather than creating a
    // duplicate line. But the same item sourced from a *different*
    // warehouse (its own separate price/stock) is deliberately kept as its
    // own distinct line, unlike the storefront cart which only ever holds
    // one warehouse per item — admins need to represent "some of this
    // shipped from A, more from B" as two line items with two prices.
    if (body.action === "addLineItem") {
      const { itemSlug, warehouseId, quantity, reason } = body as {
        itemSlug?: string;
        warehouseId?: string;
        quantity?: unknown;
        reason?: string;
      };
      if (
        !itemSlug ||
        typeof itemSlug !== "string" ||
        !warehouseId ||
        typeof warehouseId !== "string" ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          { error: "itemSlug, warehouseId and a positive integer quantity are required" },
          { status: 400 },
        );
      }

      const [existing] = await db
        .select({
          lineItems: schema.order.lineItems,
          notes: schema.order.notes,
          currency: schema.order.currency,
          locale: schema.order.locale,
        })
        .from(schema.order)
        .where(eq(schema.order.id, id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const lineItems = parseLineItems(existing.lineItems as JsonValue | null);

      const [itemRow] = await db
        .select({ id: schema.item.id, articleId: schema.item.articleId })
        .from(schema.item)
        .where(eq(schema.item.slug, itemSlug))
        .limit(1);
      if (!itemRow) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const actorLabel =
        authResult.session.user.email ?? authResult.session.user.name ?? authResult.role;

      // Already on the order from this exact warehouse — increase quantity
      // on that line rather than creating a duplicate. Same item from a
      // *different* warehouse falls through to create a new, separate line
      // below (see comment above the action).
      const existingIndex = findLineIndex(lineItems, itemRow.id, warehouseId);
      if (existingIndex !== -1) {
        const existingLine = lineItems[existingIndex];
        const updatedLineItems = [...lineItems];
        updatedLineItems[existingIndex] = {
          ...existingLine,
          quantity: (existingLine.quantity ?? 0) + quantity,
        };
        const totals = recomputeOrderTotalsFromLineItems(updatedLineItems);
        const updatedNotes = appendAuditNote(
          existing.notes,
          actorLabel,
          `Increased quantity: "${existingLine.name}" +${quantity} (now ${updatedLineItems[existingIndex].quantity})${reason ? ` — ${reason}` : ""}`,
        );
        await db
          .update(schema.order)
          .set({
            lineItems: updatedLineItems,
            notes: updatedNotes,
            totalNet: totals.totalNet,
            totalVat: totals.totalVat,
            totalGross: totals.totalGross,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.order.id, id));
        return NextResponse.json({
          lineItems: updatedLineItems.map(computeLineItemDerived),
          notes: updatedNotes,
          totalNet: totals.totalNet,
          totalVat: totals.totalVat,
          totalGross: totals.totalGross,
          warnings: [],
        });
      }

      const [priceRow] = await db
        .select({
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
        .where(and(eq(schema.itemPrice.itemSlug, itemSlug), eq(schema.itemPrice.warehouseId, warehouseId)))
        .limit(1);
      if (!priceRow || !priceRow.warehouse) {
        return NextResponse.json(
          { error: "This item is not available in the selected warehouse" },
          { status: 400 },
        );
      }

      const itemDetailRows = await db
        .select({ itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
        .from(schema.itemDetails)
        .where(eq(schema.itemDetails.itemSlug, itemSlug));
      const name =
        itemDetailRows.find((d) => d.locale === existing.locale)?.itemName ??
        itemDetailRows[0]?.itemName ??
        itemRow.articleId;

      const domainKey = domainKeyFromCurrency(existing.currency);
      const [domainVatRow] = await db
        .select({ vatPercentage: schema.warehouseCountries.vatPercentage })
        .from(schema.warehouseCountries)
        .where(eq(schema.warehouseCountries.slug, domainKey))
        .limit(1);
      const vatRate = (domainVatRow?.vatPercentage ?? 0) / 100;

      const resolveRate = await buildRateResolver();
      const originalCurrency = priceRow.initialCurrency ?? null;
      const exchangeRate = originalCurrency ? resolveRate(originalCurrency, existing.currency) : 1;
      const basePriceNet = priceRow.price;
      const specialPriceNet =
        priceRow.promotionPrice != null && isPromoActive(priceRow.promoStartDate, priceRow.promoEndDate)
          ? priceRow.promotionPrice
          : null;
      const unitPriceNet = specialPriceNet ?? basePriceNet;

      const newLine: OrderLineItem = {
        itemId: itemRow.id,
        articleId: itemRow.articleId,
        itemSlug,
        name,
        quantity,
        warehouseId: priceRow.warehouse.id,
        warehouseName: priceRow.warehouse.name ?? priceRow.warehouse.displayedName ?? null,
        warehouseDisplayedName: priceRow.warehouse.displayedName ?? null,
        warehouseCountry: priceRow.warehouse.countrySlug ?? null,
        originalCurrency,
        vatRate,
        exchangeRate,
        basePriceNet,
        specialPriceNet,
        unitPriceNet,
        costPriceNet: priceRow.initialPrice ?? null,
        costMarginPercent: priceRow.margin ?? null,
      };

      const warnings: string[] = [];
      if (priceRow.quantity < quantity) {
        warnings.push("Requested quantity exceeds current stock at this warehouse.");
      }
      const visible = await isWarehouseVisibleOnDomain(warehouseId, domainKey);
      if (!visible) {
        warnings.push(
          "Selected warehouse is not normally visible on this order's storefront domain.",
        );
      }

      const updatedLineItems = [...lineItems, newLine];
      const totals = recomputeOrderTotalsFromLineItems(updatedLineItems);

      const updatedNotes = appendAuditNote(
        existing.notes,
        actorLabel,
        `Added item: "${name}" x${quantity} from ${priceRow.warehouse.displayedName ?? priceRow.warehouse.name ?? warehouseId}${reason ? ` — ${reason}` : ""}`,
      );

      await db
        .update(schema.order)
        .set({
          lineItems: updatedLineItems,
          notes: updatedNotes,
          totalNet: totals.totalNet,
          totalVat: totals.totalVat,
          totalGross: totals.totalGross,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.order.id, id));

      return NextResponse.json({
        lineItems: updatedLineItems.map(computeLineItemDerived),
        notes: updatedNotes,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
        warnings,
      });
    }

    // Remove a line item from the order entirely.
    if (body.action === "removeLineItem") {
      const { itemId, warehouseId, reason } = body as {
        itemId?: string;
        warehouseId?: string;
        reason?: string;
      };
      if (!itemId || typeof itemId !== "string" || !warehouseId || typeof warehouseId !== "string") {
        return NextResponse.json({ error: "itemId and warehouseId are required" }, { status: 400 });
      }

      const [existing] = await db
        .select({ lineItems: schema.order.lineItems, notes: schema.order.notes })
        .from(schema.order)
        .where(eq(schema.order.id, id))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const lineItems = parseLineItems(existing.lineItems as JsonValue | null);
      const lineIndex = findLineIndex(lineItems, itemId, warehouseId);
      if (lineIndex === -1) {
        return NextResponse.json({ error: "Line item not found" }, { status: 404 });
      }
      const line = lineItems[lineIndex];
      const updatedLineItems = lineItems.filter((_, i) => i !== lineIndex);
      const totals = recomputeOrderTotalsFromLineItems(updatedLineItems);

      const actorLabel =
        authResult.session.user.email ?? authResult.session.user.name ?? authResult.role;
      const updatedNotes = appendAuditNote(
        existing.notes,
        actorLabel,
        `Removed item: "${line.name}" x${line.quantity}${reason ? ` — ${reason}` : ""}`,
      );

      await db
        .update(schema.order)
        .set({
          lineItems: updatedLineItems,
          notes: updatedNotes,
          totalNet: totals.totalNet,
          totalVat: totals.totalVat,
          totalGross: totals.totalGross,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.order.id, id));

      return NextResponse.json({
        lineItems: updatedLineItems.map(computeLineItemDerived),
        notes: updatedNotes,
        totalNet: totals.totalNet,
        totalVat: totals.totalVat,
        totalGross: totals.totalGross,
        warnings: [],
      });
    }

    const { status, deliveryId } = body as {
      status?: OrderStatus;
      deliveryId?: string | null;
    };

    if (!status || !(ORDER_STATUS_OPTIONS as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
      );
    }

    if (
      status === "DELIVERY" &&
      (!deliveryId ||
        typeof deliveryId !== "string" ||
        deliveryId.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Delivery ID is required when status is DELIVERY" },
        { status: 400 },
      );
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === "DELIVERY") {
      updateData.deliveryId = deliveryId?.trim() ?? null;
    } else if (deliveryId !== undefined) {
      updateData.deliveryId = deliveryId ? deliveryId.trim() : null;
    }

    // Drizzle implementation
    const [updatedOrderData] = await db
      .update(schema.order)
      .set(updateData)
      .where(eq(schema.order.id, id))
      .returning();

    if (!updatedOrderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch user data
    const [userData] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.user)
      .where(eq(schema.user.id, updatedOrderData.userId))
      .limit(1);

    // Fetch items with details
    let items: any[] = [];
    const lineItems = parseLineItems(
      updatedOrderData.lineItems as JsonValue | null,
    );
    const itemIds = lineItems.map((li) => li.itemId).filter(Boolean);
    if (itemIds.length > 0) {
      const itemsData = await db
        .select()
        .from(schema.item)
        .where(inArray(schema.item.id, itemIds));

      items = await Promise.all(
        itemsData.map(async (item) => {
          const [itemDetail] = await db
            .select({ itemName: schema.itemDetails.itemName })
            .from(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, item.articleId))
            .limit(1);

          const [priceData] = await db
            .select({
              id: schema.itemPrice.id,
              price: schema.itemPrice.price,
              warehouse: schema.warehouse,
            })
            .from(schema.itemPrice)
            .leftJoin(
              schema.warehouse,
              eq(schema.itemPrice.warehouseId, schema.warehouse.id),
            )
            .where(eq(schema.itemPrice.itemSlug, item.articleId))
            .limit(1);

          return {
            id: item.id,
            articleId: item.articleId,
            itemDetails: itemDetail ? [itemDetail] : [],
            itemPrice: priceData ? [priceData] : [],
          };
        }),
      );
    }

    const updatedOrder = {
      ...updatedOrderData,
      user: userData,
      items,
    };

    // Fetch payment currency for GTM tracking
    const [paymentRecord] = await db
      .select({ currency: schema.payment.currency })
      .from(schema.payment)
      .where(eq(schema.payment.orderId, id))
      .limit(1);

    /* Prisma implementation (commented out)
    const updateData: Record<string, unknown> = { status };

    if (status === 'DELIVERY') {
      updateData.deliveryId = deliveryId?.trim() ?? null;
    } else if (deliveryId !== undefined) {
      updateData.deliveryId = deliveryId ? deliveryId.trim() : null;
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            itemDetails: {
              select: {
                itemName: true,
              },
              take: 1,
            },
            itemPrice: {
              include: {
                warehouse: true,
              },
              take: 1,
            },
          },
        },
      },
    });
    */

    return NextResponse.json({
      order: mapOrder(updatedOrder),
      currency: paymentRecord?.currency ?? null,
      viewerRole: authResult.role,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await ensureAuthorized(request);
    if ("error" in authResult) {
      return authResult.error;
    }

    // Only admins can delete orders
    if (authResult.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: only admins can delete orders" },
        { status: 403 },
      );
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(schema.order)
      .where(eq(schema.order.id, id))
      .returning({ id: schema.order.id });

    if (!deleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
