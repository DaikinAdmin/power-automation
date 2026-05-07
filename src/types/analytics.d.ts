export interface FinancialSummary {
  totalOrders: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  avgOrderValue: number;
}

export interface FinancialByStatus {
  status: string;
  count: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface FinancialMonthlyRow {
  year: number;
  month: number;
  totalOrders: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface FinancialReportData {
  summary: FinancialSummary;
  byStatus: FinancialByStatus[];
  monthly: FinancialMonthlyRow[];
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
  | 'totalValue';

export interface InventoryColumnDef {
  key: InventoryColumnKey;
  group: 'identifiers' | 'names' | 'warehouse' | 'stock' | 'pricing';
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
