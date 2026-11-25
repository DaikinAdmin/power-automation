export interface FinancialSummary {
  totalOrders: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  avgOrderValue: number;
  // null only when zero line items in range have a cost snapshot at all.
  // profitCoveragePercent tells the reader how much of the total the figure
  // actually covers when it's a partial (not 100%) sample.
  totalProfit: number | null;
  profitCoveragePercent: number;
}

export interface FinancialByStatus {
  status: string;
  count: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

/** @deprecated replaced by FinancialTrendRow — kept only for old imports */
export interface FinancialMonthlyRow {
  year: number;
  month: number;
  totalOrders: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export type FinancialGranularity = 'day' | 'week' | 'month';

export interface FinancialTrendRow {
  // ISO date (day granularity), ISO week-start date, or YYYY-MM-01 (month)
  period: string;
  totalOrders: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface FinancialByWarehouseRow {
  warehouseId: string;
  warehouseName: string;
  orderCount: number;
  totalNet: number;
  totalProfit: number | null;
  profitCoveragePercent: number;
}

export interface FinancialReportData {
  summary: FinancialSummary;
  byStatus: FinancialByStatus[];
  trend: FinancialTrendRow[];
  byWarehouse: FinancialByWarehouseRow[];
  granularity: FinancialGranularity;
  dateFrom: string;
  dateTo: string;
}

export interface WarehouseOption {
  id: string;
  name: string | null;
  displayedName: string;
}

// ─── Inventory column configuration ─────────────────────────────────────────

export type InventoryColumnKey =
  // Identifiers
  | 'articleId'
  | 'itemSlug'
  | 'alias'
  // Names / brand
  | 'namesPl'
  | 'namesUa'
  | 'namesEs'
  | 'namesEn'
  | 'brand'
  | 'brandSlug'
  // Category
  | 'category'
  | 'subcategory'
  | 'categorySlug'
  // Product
  | 'isVisible'
  | 'seller'
  | 'popularity'
  | 'sellCounter'
  | 'warrantyLength'
  | 'warrantyType'
  | 'imageCount'
  | 'imageLinks'
  | 'linkedItems'
  | 'createdAt'
  | 'updatedAt'
  // Descriptions
  | 'descriptionPl'
  | 'descriptionUa'
  | 'descriptionEn'
  | 'descriptionEs'
  | 'specificationsPl'
  | 'specificationsUa'
  | 'specificationsEn'
  | 'specificationsEs'
  // Meta
  | 'metaDescriptionPl'
  | 'metaDescriptionUa'
  | 'metaDescriptionEn'
  | 'metaDescriptionEs'
  | 'metaKeyWordsPl'
  | 'metaKeyWordsUa'
  | 'metaKeyWordsEn'
  | 'metaKeyWordsEs'
  // Warehouse
  | 'warehouseId'
  | 'warehouseName'
  | 'warehouseDisplayedName'
  | 'warehouseCountry'
  | 'warehouseIsVisible'
  // Stock
  | 'quantity'
  | 'badge'
  // Pricing
  | 'initialPrice'
  | 'initialCurrency'
  | 'margin'
  | 'priceWithMarginNoVat'
  | 'vatUa'
  | 'vatPl'
  | 'priceWithMarginWithVatUa'
  | 'priceWithMarginWithVatPl'
  | 'initialPriceDisplay'
  | 'totalValue'
  | 'priceUpdatedAt'
  // Promo
  | 'promotionPrice'
  | 'promoCode'
  | 'promoStartDate'
  | 'promoEndDate'
  // Sizes
  | 'grossWeight'
  | 'lengthPacking'
  | 'widthPacking'
  | 'heightPacking';

export type InventoryColumnGroup =
  | 'identifiers'
  | 'names'
  | 'category'
  | 'product'
  | 'descriptions'
  | 'meta'
  | 'warehouse'
  | 'stock'
  | 'pricing'
  | 'promo'
  | 'sizes';

export interface InventoryColumnDef {
  key: InventoryColumnKey;
  group: InventoryColumnGroup;
  defaultVisible: boolean;
  numeric: boolean;
  format?: 'price' | 'percent' | 'integer' | 'date';
  // Long text — truncated in the table, full value in the tooltip
  truncate?: boolean;
}

// ─── Inventory row ───────────────────────────────────────────────────────────

export interface InventoryRow {
  itemSlug: string;
  articleId: string;
  alias: string | null;
  // Multilingual product names
  namesPl: string;
  namesUa: string;
  namesEs: string;
  namesEn: string;
  // Brand
  brand: string | null;
  brandSlug: string | null;
  // Category (names in the requested UI locale)
  category: string | null;
  subcategory: string | null;
  categorySlug: string;
  // Product
  // Whether the product is shown on the site (item.isDisplayed)
  isVisible: boolean;
  seller: string | null;
  popularity: number | null;
  sellCounter: number | null;
  warrantyLength: number;
  warrantyType: string;
  imageCount: number;
  imageLinks: string;
  linkedItems: string;
  createdAt: string;
  updatedAt: string;
  // Descriptions (HTML stripped) — only filled when the column is requested
  descriptionPl: string | null;
  descriptionUa: string | null;
  descriptionEn: string | null;
  descriptionEs: string | null;
  specificationsPl: string | null;
  specificationsUa: string | null;
  specificationsEn: string | null;
  specificationsEs: string | null;
  // Meta — only filled when the column is requested
  metaDescriptionPl: string | null;
  metaDescriptionUa: string | null;
  metaDescriptionEn: string | null;
  metaDescriptionEs: string | null;
  metaKeyWordsPl: string | null;
  metaKeyWordsUa: string | null;
  metaKeyWordsEn: string | null;
  metaKeyWordsEs: string | null;
  // Warehouse
  warehouseId: string;
  warehouseName: string;
  warehouseDisplayedName: string;
  warehouseCountry: string | null;
  warehouseIsVisible: boolean;
  // Stock
  quantity: number;
  badge: string;
  // Base pricing (stored)
  price: number;
  initialPrice: number | null;
  initialCurrency: string | null;
  margin: number | null;
  // initialPrice converted to the currently selected display currency
  initialPriceDisplay: number | null;
  // Derived prices — based on stored price (margin already included)
  priceWithMarginNoVat: number;
  vatUa: number;
  vatPl: number;
  priceWithMarginWithVatUa: number;
  priceWithMarginWithVatPl: number;
  // Total
  totalValue: number;
  priceUpdatedAt: string;
  // Promo (promotionPrice converted to the display currency)
  promotionPrice: number | null;
  promoCode: string | null;
  promoStartDate: string | null;
  promoEndDate: string | null;
  // Sizes
  grossWeight: number | null;
  lengthPacking: number | null;
  widthPacking: number | null;
  heightPacking: number | null;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockValue: number;
  zeroStockCount: number;
}

export interface InventoryPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InventoryCategoryOption {
  // Filter value: "cat:<slug>" or "sub:<slug>" — a category and a subcategory
  // can share a slug, so the slug alone is not unique
  value: string;
  slug: string;
  name: string;
  // null for a top-level category, parent slug for a subcategory
  parentSlug: string | null;
}

export interface InventoryFilterOptions {
  brands: { alias: string; name: string }[];
  categories: InventoryCategoryOption[];
  badges: string[];
}

export interface InventoryReportData {
  warehouses: WarehouseOption[];
  // Current page only (or every filtered row when requested with all=1)
  rows: InventoryRow[];
  // Computed over every filtered row, not just the current page
  summary: InventorySummary;
  displayCurrency: string;
  pagination: InventoryPagination;
  filterOptions: InventoryFilterOptions;
}
