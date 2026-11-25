import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import {
  eq,
  and,
  or,
  ilike,
  inArray,
  exists,
  gt,
  lte,
  isNull,
  asc,
  sql,
  type SQL,
} from "drizzle-orm";
import * as schema from "@/db/schema";
import { apiErrorHandler } from "@/lib/error-handler";
import type {
  InventoryReportData,
  InventoryRow,
  InventoryCategoryOption,
} from "@/types/analytics";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);
const VALID_CURRENCIES = new Set(["EUR", "UAH", "PLN"]);
const VALID_LOCALES = new Set(["pl", "ua", "en", "es"]);
const BADGES: readonly string[] = schema.badge.enumValues;
type BadgeValue = (typeof schema.badge.enumValues)[number];

// Prefixes of the `category` filter value (see categoryOptions)
const CATEGORY_PREFIX = "cat:";
const SUBCATEGORY_PREFIX = "sub:";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;
// Keeps `IN (...)` lists well below the Postgres bind-parameter limit
const SLUG_CHUNK_SIZE = 1000;

// Column-key suffix → item_details.locale
const LOCALES = [
  ["Pl", "pl"],
  ["Ua", "ua"],
  ["En", "en"],
  ["Es", "es"],
] as const;
type LocaleSuffix = (typeof LOCALES)[number][0];

const localizedKeys = (prefix: string) => LOCALES.map(([s]) => `${prefix}${s}`);

// item_details fields that can be large — loaded only when one of their
// columns is requested (see the `columns` query param).
const ON_DEMAND_FIELDS = {
  description: localizedKeys("description"),
  specifications: localizedKeys("specifications"),
  metaDescription: localizedKeys("metaDescription"),
  metaKeyWords: localizedKeys("metaKeyWords"),
  seller: ["seller"],
  popularity: ["popularity"],
};

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

// Descriptions/specifications are stored as HTML — the report shows plain text.
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function perLocale<P extends string, T>(
  prefix: P,
  get: (locale: string) => T,
): Record<`${P}${LocaleSuffix}`, T> {
  const out: Record<string, T> = {};
  for (const [suffix, locale] of LOCALES) out[`${prefix}${suffix}`] = get(locale);
  return out as Record<`${P}${LocaleSuffix}`, T>;
}

async function inChunks<T>(
  values: string[],
  query: (chunk: string[]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += SLUG_CHUNK_SIZE) {
    const part = await query(values.slice(i, i + SLUG_CHUNK_SIZE));
    for (const row of part) out.push(row);
  }
  return out;
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

    // ── Query params ─────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const rawCurrency = searchParams.get("currency") ?? "EUR";
    const displayCurrency = VALID_CURRENCIES.has(rawCurrency)
      ? rawCurrency
      : "EUR";
    const rawLocale = searchParams.get("locale") ?? "";
    const locale = VALID_LOCALES.has(rawLocale) ? rawLocale : "pl";

    const search = (searchParams.get("search") ?? "").trim();
    const brandFilter = searchParams.get("brand") ?? "";
    const categoryFilter = searchParams.get("category") ?? "";
    const badgeFilter = searchParams.get("badge") ?? "";
    const visibilityFilter = searchParams.get("visibility") ?? "";
    const stockFilter = searchParams.get("stock") ?? "";

    // all=1 returns every filtered row (used by the exports)
    const all = searchParams.get("all") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "", 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(searchParams.get("pageSize") ?? "", 10) || DEFAULT_PAGE_SIZE,
      ),
    );

    // Visible columns — decides which heavy text fields get loaded.
    // Without the param everything is loaded.
    const columnsParam = searchParams.get("columns");
    const requestedColumns =
      columnsParam === null
        ? null
        : new Set(columnsParam.split(",").filter(Boolean));
    const wants = (keys: readonly string[]) =>
      requestedColumns === null || keys.some((k) => requestedColumns.has(k));

    // ── Reference data ───────────────────────────────────────────────────────
    const [
      warehouses,
      allRates,
      allBrands,
      categories,
      subcategories,
      categoryTranslations,
      subcategoryTranslations,
    ] = await Promise.all([
      db
        .select({
          id: schema.warehouse.id,
          name: schema.warehouse.name,
          displayedName: schema.warehouse.displayedName,
          countrySlug: schema.warehouse.countrySlug,
          isVisible: schema.warehouse.isVisible,
        })
        .from(schema.warehouse)
        .orderBy(schema.warehouse.displayedName),
      db.select().from(schema.currencyExchange),
      db
        .select({ alias: schema.brand.alias, name: schema.brand.name })
        .from(schema.brand)
        .orderBy(schema.brand.name),
      db
        .select({ slug: schema.category.slug, name: schema.category.name })
        .from(schema.category),
      db
        .select({
          slug: schema.subcategories.slug,
          name: schema.subcategories.name,
          categorySlug: schema.subcategories.categorySlug,
        })
        .from(schema.subcategories),
      db
        .select({
          categorySlug: schema.categoryTranslation.categorySlug,
          name: schema.categoryTranslation.name,
        })
        .from(schema.categoryTranslation)
        .where(eq(schema.categoryTranslation.locale, locale)),
      db
        .select({
          subCategorySlug: schema.subcategoryTranslation.subCategorySlug,
          name: schema.subcategoryTranslation.name,
        })
        .from(schema.subcategoryTranslation)
        .where(eq(schema.subcategoryTranslation.locale, locale)),
    ]);

    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const rates: Record<string, Record<string, number>> = {};
    for (const r of allRates) {
      rates[r.from] ??= {};
      rates[r.from][r.to] = r.rate;
    }

    const brandNameByAlias = new Map(allBrands.map((b) => [b.alias, b.name]));

    // Category names in the requested locale (fallback: base name)
    const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
    for (const t of categoryTranslations) categoryName.set(t.categorySlug, t.name);
    const subcategoryInfo = new Map(
      subcategories.map((s) => [s.slug, { name: s.name, parent: s.categorySlug }]),
    );
    for (const t of subcategoryTranslations) {
      const sub = subcategoryInfo.get(t.subCategorySlug);
      if (sub) sub.name = t.name;
    }

    // item.categorySlug points either to a subcategory or to a category
    const resolveCategory = (slug: string) => {
      const sub = subcategoryInfo.get(slug);
      if (sub) {
        return {
          category: categoryName.get(sub.parent) ?? sub.parent,
          subcategory: sub.name,
        };
      }
      return { category: categoryName.get(slug) ?? null, subcategory: null };
    };

    // Option values carry the kind ("cat:" / "sub:") because a category and a
    // subcategory may share the same slug. Rows with an empty slug are skipped.
    const byName = (a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name);
    const categoryOptions: InventoryCategoryOption[] = [];
    for (const c of categories
      .filter((c) => c.slug)
      .map((c) => ({ slug: c.slug, name: categoryName.get(c.slug) ?? c.name }))
      .sort(byName)) {
      categoryOptions.push({
        value: `${CATEGORY_PREFIX}${c.slug}`,
        slug: c.slug,
        name: c.name,
        parentSlug: null,
      });
      const children = [...subcategoryInfo.entries()]
        .filter(([slug, s]) => slug && s.parent === c.slug)
        .map(([slug, s]) => ({ slug, name: s.name }))
        .sort(byName);
      for (const s of children) {
        categoryOptions.push({
          value: `${SUBCATEGORY_PREFIX}${s.slug}`,
          slug: s.slug,
          name: s.name,
          parentSlug: c.slug,
        });
      }
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    const filters: SQL[] = [];

    if (warehouseId) {
      filters.push(eq(schema.itemPrice.warehouseId, warehouseId));
    }
    if (brandFilter) {
      filters.push(eq(schema.item.brandSlug, brandFilter));
    }
    if (categoryFilter.startsWith(SUBCATEGORY_PREFIX)) {
      const slug = categoryFilter.slice(SUBCATEGORY_PREFIX.length);
      filters.push(eq(schema.item.categorySlug, slug));
    } else if (categoryFilter) {
      // A top-level category also matches items of its subcategories
      const slug = categoryFilter.startsWith(CATEGORY_PREFIX)
        ? categoryFilter.slice(CATEGORY_PREFIX.length)
        : categoryFilter;
      const childSlugs = subcategories
        .filter((s) => s.categorySlug === slug)
        .map((s) => s.slug);
      filters.push(inArray(schema.item.categorySlug, [slug, ...childSlugs]));
    }
    if (BADGES.includes(badgeFilter)) {
      const badgeEq = eq(schema.itemPrice.badge, badgeFilter as BadgeValue);
      // Rows without a badge are reported as ABSENT
      filters.push(
        badgeFilter === "ABSENT"
          ? or(badgeEq, isNull(schema.itemPrice.badge))!
          : badgeEq,
      );
    }
    if (visibilityFilter === "visible") {
      filters.push(eq(schema.item.isDisplayed, true));
    } else if (visibilityFilter === "hidden") {
      filters.push(eq(schema.item.isDisplayed, false));
    }
    if (stockFilter === "inStock") {
      filters.push(gt(schema.itemPrice.quantity, 0));
    } else if (stockFilter === "zero") {
      filters.push(lte(schema.itemPrice.quantity, 0));
    }
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      filters.push(
        or(
          ilike(schema.item.articleId, pattern),
          ilike(schema.item.slug, pattern),
          ilike(schema.item.alias, pattern),
          exists(
            db
              .select({ one: sql`1` })
              .from(schema.itemDetails)
              .where(
                and(
                  eq(schema.itemDetails.itemSlug, schema.item.slug),
                  ilike(schema.itemDetails.itemName, pattern),
                ),
              ),
          ),
        )!,
      );
    }

    // ── Item prices (every filtered row — needed for summary & paging) ───────
    const rawRows = await db
      .select({
        itemSlug: schema.item.slug,
        articleId: schema.item.articleId,
        alias: schema.item.alias,
        brandSlug: schema.item.brandSlug,
        categorySlug: schema.item.categorySlug,
        isDisplayed: schema.item.isDisplayed,
        sellCounter: schema.item.sellCounter,
        warrantyLength: schema.item.warrantyLength,
        warrantyType: schema.item.warrantyType,
        itemImageLink: schema.item.itemImageLink,
        linkedItems: schema.item.linkedItems,
        createdAt: schema.item.createdAt,
        updatedAt: schema.item.updatedAt,
        grossWeight: schema.item.grossWeight,
        heightPacking: schema.item.heightPacking,
        widthPacking: schema.item.widthPacking,
        lengthPacking: schema.item.lengthPacking,
        warehouseId: schema.itemPrice.warehouseId,
        quantity: schema.itemPrice.quantity,
        price: schema.itemPrice.price,
        initialPrice: schema.itemPrice.initialPrice,
        initialCurrency: schema.itemPrice.initialCurrency,
        margin: schema.itemPrice.margin,
        badge: schema.itemPrice.badge,
        promotionPrice: schema.itemPrice.promotionPrice,
        promoCode: schema.itemPrice.promoCode,
        promoStartDate: schema.itemPrice.promoStartDate,
        promoEndDate: schema.itemPrice.promoEndDate,
        priceUpdatedAt: schema.itemPrice.updatedAt,
      })
      .from(schema.itemPrice)
      .innerJoin(schema.item, eq(schema.itemPrice.itemSlug, schema.item.slug))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(schema.item.articleId), asc(schema.itemPrice.warehouseId));

    // price is stored in initialCurrency — convert to the display currency
    const toDisplay = (amount: number | null, from: string | null) => {
      if (amount === null) return null;
      if (!from) return amount;
      return convertPrice(amount, from, displayCurrency, rates) ?? amount;
    };

    // ── Summary (over all filtered rows) ─────────────────────────────────────
    let totalStockValue = 0;
    let zeroStockCount = 0;
    for (const r of rawRows) {
      totalStockValue += (toDisplay(r.price, r.initialCurrency) ?? 0) * r.quantity;
      if (r.quantity === 0) zeroStockCount++;
    }

    // ── Pagination ───────────────────────────────────────────────────────────
    const total = rawRows.length;
    const totalPages = all ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const currentPage = all ? 1 : Math.min(page, totalPages);
    const pageRows = all
      ? rawRows
      : rawRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // ── Item details for the rows being returned ─────────────────────────────
    // Heavy text fields come back as NULL unless one of their columns is visible
    const textField = (
      field: keyof typeof ON_DEMAND_FIELDS,
      column:
        | typeof schema.itemDetails.description
        | typeof schema.itemDetails.specifications
        | typeof schema.itemDetails.metaDescription
        | typeof schema.itemDetails.metaKeyWords
        | typeof schema.itemDetails.seller,
    ) =>
      wants(ON_DEMAND_FIELDS[field])
        ? sql<string | null>`${column}`
        : sql<string | null>`NULL`;

    const slugs = [...new Set(pageRows.map((r) => r.itemSlug))];
    const details = await inChunks(slugs, (chunk) =>
      db
        .select({
          itemSlug: schema.itemDetails.itemSlug,
          locale: schema.itemDetails.locale,
          itemName: schema.itemDetails.itemName,
          description: textField("description", schema.itemDetails.description),
          specifications: textField(
            "specifications",
            schema.itemDetails.specifications,
          ),
          metaDescription: textField(
            "metaDescription",
            schema.itemDetails.metaDescription,
          ),
          metaKeyWords: textField("metaKeyWords", schema.itemDetails.metaKeyWords),
          seller: textField("seller", schema.itemDetails.seller),
          popularity: wants(ON_DEMAND_FIELDS.popularity)
            ? sql<number | null>`${schema.itemDetails.popularity}`
            : sql<number | null>`NULL`,
        })
        .from(schema.itemDetails)
        .where(inArray(schema.itemDetails.itemSlug, chunk)),
    );

    type DetailRow = (typeof details)[number];
    const detailsBySlug = new Map<string, Map<string, DetailRow>>();
    for (const d of details) {
      let byLocale = detailsBySlug.get(d.itemSlug);
      if (!byLocale) {
        byLocale = new Map();
        detailsBySlug.set(d.itemSlug, byLocale);
      }
      byLocale.set(d.locale, d);
    }

    // ── Build rows ───────────────────────────────────────────────────────────
    const rows: InventoryRow[] = pageRows.map((r) => {
      const wh = warehouseMap.get(r.warehouseId);
      const det = detailsBySlug.get(r.itemSlug);
      const at = (loc: string) => det?.get(loc);
      // Locale-independent detail fields: first non-empty value, PL first
      const firstOf = <K extends "seller" | "popularity">(key: K) => {
        for (const [, loc] of LOCALES) {
          const v = at(loc)?.[key];
          if (v !== null && v !== undefined && v !== "") return v;
        }
        return null;
      };

      const currency = r.initialCurrency ?? null;
      const sellingPrice = toDisplay(r.price, currency) ?? r.price;

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

      const images = r.itemImageLink ?? [];

      return {
        itemSlug: r.itemSlug,
        articleId: r.articleId,
        alias: r.alias ?? null,
        ...perLocale("names", (loc) => at(loc)?.itemName ?? ""),
        brand: r.brandSlug ? (brandNameByAlias.get(r.brandSlug) ?? null) : null,
        brandSlug: r.brandSlug ?? null,
        ...resolveCategory(r.categorySlug),
        categorySlug: r.categorySlug,
        isVisible: r.isDisplayed,
        seller: firstOf("seller") as string | null,
        popularity: firstOf("popularity") as number | null,
        sellCounter: r.sellCounter ?? null,
        warrantyLength: r.warrantyLength,
        warrantyType: r.warrantyType,
        imageCount: images.length,
        imageLinks: images.join(", "),
        linkedItems: (r.linkedItems ?? []).join(", "),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        ...perLocale("description", (loc) => stripHtml(at(loc)?.description)),
        ...perLocale("specifications", (loc) =>
          stripHtml(at(loc)?.specifications),
        ),
        ...perLocale("metaDescription", (loc) => at(loc)?.metaDescription ?? null),
        ...perLocale("metaKeyWords", (loc) => at(loc)?.metaKeyWords ?? null),
        warehouseId: r.warehouseId,
        warehouseName: wh?.name ?? "",
        warehouseDisplayedName: wh?.displayedName ?? r.warehouseId,
        warehouseCountry: wh?.countrySlug ?? null,
        warehouseIsVisible: wh?.isVisible ?? true,
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
        priceUpdatedAt: r.priceUpdatedAt,
        promotionPrice: toDisplay(r.promotionPrice, currency),
        promoCode: r.promoCode ?? null,
        promoStartDate: r.promoStartDate ?? null,
        promoEndDate: r.promoEndDate ?? null,
        grossWeight: r.grossWeight,
        heightPacking: r.heightPacking,
        widthPacking: r.widthPacking,
        lengthPacking: r.lengthPacking,
      };
    });

    const data: InventoryReportData = {
      warehouses: warehouses.map((w) => ({
        id: w.id,
        name: w.name,
        displayedName: w.displayedName,
      })),
      rows,
      summary: {
        totalProducts: total,
        totalStockValue,
        zeroStockCount,
      },
      displayCurrency,
      pagination: {
        page: currentPage,
        pageSize: all ? total : pageSize,
        total,
        totalPages,
      },
      filterOptions: {
        // Radix Select rejects "" as an item value
        brands: allBrands.filter((b) => b.alias),
        categories: categoryOptions,
        badges: [...BADGES],
      },
    };
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorHandler(error, "GET /api/admin/analytics/inventory");
  }
}
