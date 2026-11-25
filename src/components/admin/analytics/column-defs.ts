import type {
  InventoryColumnDef,
  InventoryColumnGroup,
  InventoryColumnKey,
} from "@/types/analytics";

// Order of groups in the column-config modal
export const INVENTORY_COLUMN_GROUPS: InventoryColumnGroup[] = [
  "identifiers",
  "names",
  "category",
  "product",
  "warehouse",
  "stock",
  "pricing",
  "promo",
  "sizes",
  "descriptions",
  "meta",
];

// One long-text column per content locale: `${prefix}Pl`, `${prefix}Ua`, …
function localizedTextColumns(
  prefix: "description" | "specifications" | "metaDescription" | "metaKeyWords",
  group: InventoryColumnGroup,
): InventoryColumnDef[] {
  return (["Pl", "Ua", "En", "Es"] as const).map((l) => ({
    key: `${prefix}${l}`,
    group,
    defaultVisible: false,
    numeric: false,
    truncate: true,
  }));
}

// Order here is the column order in the table and in the exports
export const INVENTORY_COLUMNS: InventoryColumnDef[] = [
  // Identifiers
  {
    key: "articleId",
    group: "identifiers",
    defaultVisible: true,
    numeric: false,
  },
  { key: "itemSlug", group: "identifiers", defaultVisible: false, numeric: false },
  { key: "alias", group: "identifiers", defaultVisible: false, numeric: false },

  // Product names
  { key: "namesPl", group: "names", defaultVisible: true, numeric: false, truncate: true },
  { key: "namesUa", group: "names", defaultVisible: false, numeric: false, truncate: true },
  { key: "namesEn", group: "names", defaultVisible: false, numeric: false, truncate: true },
  { key: "namesEs", group: "names", defaultVisible: false, numeric: false, truncate: true },
  { key: "brand", group: "names", defaultVisible: false, numeric: false },
  { key: "brandSlug", group: "names", defaultVisible: false, numeric: false },

  // Category
  { key: "category", group: "category", defaultVisible: false, numeric: false },
  { key: "subcategory", group: "category", defaultVisible: false, numeric: false },
  { key: "categorySlug", group: "category", defaultVisible: false, numeric: false },

  // Product
  { key: "isVisible", group: "product", defaultVisible: false, numeric: false },
  { key: "seller", group: "product", defaultVisible: false, numeric: false },
  {
    key: "popularity",
    group: "product",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "sellCounter",
    group: "product",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "warrantyLength",
    group: "product",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  { key: "warrantyType", group: "product", defaultVisible: false, numeric: false },
  {
    key: "imageCount",
    group: "product",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "imageLinks",
    group: "product",
    defaultVisible: false,
    numeric: false,
    truncate: true,
  },
  {
    key: "linkedItems",
    group: "product",
    defaultVisible: false,
    numeric: false,
    truncate: true,
  },
  {
    key: "createdAt",
    group: "product",
    defaultVisible: false,
    numeric: false,
    format: "date",
  },
  {
    key: "updatedAt",
    group: "product",
    defaultVisible: false,
    numeric: false,
    format: "date",
  },

  // Warehouse
  {
    key: "warehouseDisplayedName",
    group: "warehouse",
    defaultVisible: true,
    numeric: false,
  },
  {
    key: "warehouseName",
    group: "warehouse",
    defaultVisible: false,
    numeric: false,
  },
  {
    key: "warehouseId",
    group: "warehouse",
    defaultVisible: false,
    numeric: false,
  },
  {
    key: "warehouseCountry",
    group: "warehouse",
    defaultVisible: false,
    numeric: false,
  },
  {
    key: "warehouseIsVisible",
    group: "warehouse",
    defaultVisible: false,
    numeric: false,
  },

  // Stock
  {
    key: "quantity",
    group: "stock",
    defaultVisible: true,
    numeric: true,
    format: "integer",
  },
  { key: "badge", group: "stock", defaultVisible: true, numeric: false },

  // Pricing
  {
    key: "initialPrice",
    group: "pricing",
    defaultVisible: true,
    numeric: true,
    format: "price",
  },
  {
    key: "initialCurrency",
    group: "pricing",
    defaultVisible: true,
    numeric: false,
  },
  {
    key: "initialPriceDisplay",
    group: "pricing",
    defaultVisible: true,
    numeric: true,
    format: "price",
  },
  {
    key: "margin",
    group: "pricing",
    defaultVisible: false,
    numeric: true,
    format: "percent",
  },
  {
    key: "priceWithMarginNoVat",
    group: "pricing",
    defaultVisible: true,
    numeric: true,
    format: "price",
  },
  {
    key: "vatUa",
    group: "pricing",
    defaultVisible: false,
    numeric: true,
    format: "price",
  },
  {
    key: "vatPl",
    group: "pricing",
    defaultVisible: false,
    numeric: true,
    format: "price",
  },
  {
    key: "priceWithMarginWithVatUa",
    group: "pricing",
    defaultVisible: false,
    numeric: true,
    format: "price",
  },
  {
    key: "priceWithMarginWithVatPl",
    group: "pricing",
    defaultVisible: false,
    numeric: true,
    format: "price",
  },
  {
    key: "totalValue",
    group: "pricing",
    defaultVisible: true,
    numeric: true,
    format: "price",
  },
  {
    key: "priceUpdatedAt",
    group: "pricing",
    defaultVisible: false,
    numeric: false,
    format: "date",
  },

  // Promo
  {
    key: "promotionPrice",
    group: "promo",
    defaultVisible: false,
    numeric: true,
    format: "price",
  },
  { key: "promoCode", group: "promo", defaultVisible: false, numeric: false },
  {
    key: "promoStartDate",
    group: "promo",
    defaultVisible: false,
    numeric: false,
    format: "date",
  },
  {
    key: "promoEndDate",
    group: "promo",
    defaultVisible: false,
    numeric: false,
    format: "date",
  },

  // Sizes
  {
    key: "grossWeight",
    group: "sizes",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "lengthPacking",
    group: "sizes",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "widthPacking",
    group: "sizes",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },
  {
    key: "heightPacking",
    group: "sizes",
    defaultVisible: false,
    numeric: true,
    format: "integer",
  },

  // Descriptions (HTML stripped)
  ...localizedTextColumns("description", "descriptions"),
  ...localizedTextColumns("specifications", "descriptions"),

  // Meta
  ...localizedTextColumns("metaDescription", "meta"),
  ...localizedTextColumns("metaKeyWords", "meta"),
];

export const DEFAULT_VISIBLE_COLUMNS = new Set<InventoryColumnKey>(
  INVENTORY_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);
