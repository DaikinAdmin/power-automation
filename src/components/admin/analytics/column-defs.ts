import type { InventoryColumnDef, InventoryColumnKey } from "@/types/analytics";

export const INVENTORY_COLUMNS: InventoryColumnDef[] = [
  // Identifiers
  {
    key: "articleId",
    group: "identifiers",
    defaultVisible: true,
    numeric: false,
  },
  // Product names
  { key: "namesPl", group: "names", defaultVisible: true, numeric: false },
  { key: "namesUa", group: "names", defaultVisible: false, numeric: false },
  { key: "namesEn", group: "names", defaultVisible: false, numeric: false },
  { key: "namesEs", group: "names", defaultVisible: false, numeric: false },
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
];

export const DEFAULT_VISIBLE_COLUMNS = new Set<InventoryColumnKey>(
  INVENTORY_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);
