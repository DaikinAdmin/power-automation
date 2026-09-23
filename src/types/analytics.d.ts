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
  | 'articleId'
  | 'namesPl'
  | 'namesUa'
  | 'namesEs'
  | 'namesEn'
  | 'brand'
  | 'brandSlug'
  | 'warehouseId'
  | 'warehouseName'
  | 'warehouseDisplayedName'
  | 'quantity'
  | 'badge'
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
  | 'grossWeight'
  | 'lengthPacking'
  | 'widthPacking'
  | 'heightPacking';

export interface InventoryColumnDef {
  key: InventoryColumnKey;
  group: 'identifiers' | 'names' | 'warehouse' | 'stock' | 'pricing' | 'sizes';
  defaultVisible: boolean;
  numeric: boolean;
  format?: 'price' | 'percent' | 'integer';
}

// ─── Inventory row ───────────────────────────────────────────────────────────

export interface InventoryRow {
  itemSlug: string;
  articleId: string;
  // Multilingual product names
  namesPl: string;
  namesUa: string;
  namesEs: string;
  namesEn: string;
  // Brand
  brand: string | null;
  brandSlug: string | null;
  // Warehouse
  warehouseId: string;
  warehouseName: string;
  warehouseDisplayedName: string;
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

export interface InventoryReportData {
  warehouses: WarehouseOption[];
  rows: InventoryRow[];
  summary: InventorySummary;
  displayCurrency: string;
}
