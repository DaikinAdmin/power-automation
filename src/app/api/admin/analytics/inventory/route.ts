import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import * as schema from "@/db/schema";
import { apiErrorHandler } from "@/lib/error-handler";
import type { InventoryReportData, InventoryRow } from "@/types/analytics";
import { getDomainKeyByHost } from "@/lib/domain-config";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);

// Convert a price from one currency to another using the exchange-rate map.
// Falls back to an indirect route via EUR when no direct rate exists.
function convertPrice(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, Record<string, number>>,
): number | null {
  if (from === to) return amount;
  const direct = rates[from]?.[to];
  if (direct !== undefined) return amount * direct;
  // indirect: from → EUR → to
  const toEur = rates[from]?.EUR;
  const fromEur = rates.EUR?.[to];
  if (toEur !== undefined && fromEur !== undefined)
    return amount * toEur * fromEur;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user?.role || !AUTHORIZED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const host = request.headers.get("host") || "";
    const domainKey = getDomainKeyByHost(host);

    const currency =
      domainKey === "ua" ? "UAH" : domainKey === "pl" ? "PLN" : "";

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const VALID_CURRENCIES = new Set(["EUR", "UAH", "PLN"]);
    const rawCurrency = searchParams.get("currency") ?? "EUR";
    const displayCurrency = VALID_CURRENCIES.has(rawCurrency)
      ? rawCurrency
      : "EUR";

    // ── Warehouses ───────────────────────────────────────────────────────────
    const warehouses = await db
      .select({
        id: schema.warehouse.id,
        name: schema.warehouse.name,
        displayedName: schema.warehouse.displayedName,
      })
      .from(schema.warehouse)
      .orderBy(schema.warehouse.displayedName);

    const warehouseMap: Record<
      string,
      { name: string | null; displayedName: string }
    > = {};
    for (const w of warehouses) {
      warehouseMap[w.id] = { name: w.name, displayedName: w.displayedName };
    }

    // ── Exchange rates ───────────────────────────────────────────────────────
    const allRates = await db.select().from(schema.currencyExchange);
    const rates: Record<string, Record<string, number>> = {};
    for (const r of allRates) {
      rates[r.from] ??= {};
      rates[r.from][r.to] = r.rate;
    }

    // ── Item prices ──────────────────────────────────────────────────────────
    const filters = [];

    if (warehouseId) {
      filters.push(eq(schema.itemPrice.warehouseId, warehouseId));
    }

    const rawRows = await db
      .select({
        itemSlug: schema.item.slug,
        articleId: schema.item.articleId,
        brandSlug: schema.item.brandSlug,
        warehouseId: schema.itemPrice.warehouseId,
        quantity: schema.itemPrice.quantity,
        price: schema.itemPrice.price,
        initialPrice: schema.itemPrice.initialPrice,
        initialCurrency: schema.itemPrice.initialCurrency,
        margin: schema.itemPrice.margin,
        badge: schema.itemPrice.badge,
      })
      .from(schema.itemPrice)
      .innerJoin(schema.item, eq(schema.itemPrice.itemSlug, schema.item.slug))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(schema.item.articleId);

    // ── Multilingual names ───────────────────────────────────────────────────
    const allDetails = await db
      .select({
        itemSlug: schema.itemDetails.itemSlug,
        itemName: schema.itemDetails.itemName,
        locale: schema.itemDetails.locale,
      })
      .from(schema.itemDetails);

    const namesBySlug: Record<string, Record<string, string>> = {};
    for (const d of allDetails) {
      namesBySlug[d.itemSlug] ??= {};
      namesBySlug[d.itemSlug][d.locale] = d.itemName;
    }

    // ── Brand names ──────────────────────────────────────────────────────────
    const allBrands = await db
      .select({ alias: schema.brand.alias, name: schema.brand.name })
      .from(schema.brand);

    const brandNameByAlias: Record<string, string> = {};
    for (const b of allBrands) {
      brandNameByAlias[b.alias] = b.name;
    }

    // ── Build rows ───────────────────────────────────────────────────────────
    const rows: InventoryRow[] = rawRows.map((r) => {
      const wh = warehouseMap[r.warehouseId];
      const names = namesBySlug[r.itemSlug] ?? {};

      // price is the stored selling price (margin already baked in)
      // Convert it to the requested display currency before deriving all prices
      const currency = r.initialCurrency ?? null;
      const rawSellingPrice = r.price;
      const sellingPrice = currency
        ? (convertPrice(rawSellingPrice, currency, displayCurrency, rates) ??
          rawSellingPrice)
        : rawSellingPrice;

      // Derived prices — all in displayCurrency
      const priceWithMarginNoVat = sellingPrice;
      const vatUa = sellingPrice * 0.2;
      const vatPl = sellingPrice * 0.23;
      const priceWithMarginWithVatUa = sellingPrice * 1.2;
      const priceWithMarginWithVatPl = sellingPrice * 1.23;

      // Currency-converted prices (base = initialPrice, in initialCurrency)
      const baseAmount = r.initialPrice ?? 0;
      const initialPriceDisplay = currency
        ? convertPrice(baseAmount, currency, displayCurrency, rates)
        : null;

      return {
        itemSlug: r.itemSlug,
        articleId: r.articleId,
        namesPl: names["pl"] ?? "",
        namesUa: names["ua"] ?? "",
        namesEs: names["es"] ?? "",
        namesEn: names["en"] ?? "",
        brand: r.brandSlug ? (brandNameByAlias[r.brandSlug] ?? null) : null,
        brandSlug: r.brandSlug ?? null,
        warehouseId: r.warehouseId,
        warehouseName: wh?.name ?? "",
        warehouseDisplayedName: wh?.displayedName ?? r.warehouseId,
        quantity: r.quantity,
        badge: r.badge ?? "ABSENT",
        price: sellingPrice,
        initialPrice: r.initialPrice ?? null,
        initialCurrency: currency,
        margin: r.margin ?? null,
        initialPriceDisplay,
        priceWithMarginNoVat,
        vatUa,
        vatPl,
        priceWithMarginWithVatUa,
        priceWithMarginWithVatPl,
        totalValue: sellingPrice * r.quantity,
      };
    });

    const summary = {
      totalProducts: rows.length,
      totalStockValue: rows.reduce((s, r) => s + r.totalValue, 0),
      zeroStockCount: rows.filter((r) => r.quantity === 0).length,
    };

    const data: InventoryReportData = {
      warehouses,
      rows,
      summary,
      displayCurrency,
    };
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorHandler(error, "GET /api/admin/analytics/inventory");
  }
}
