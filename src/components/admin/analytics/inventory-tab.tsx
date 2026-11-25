"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileDown,
  Warehouse,
  PackageOpen,
  AlertTriangle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import type {
  InventoryReportData,
  InventoryColumnKey,
  InventoryColumnDef,
} from "@/types/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCard, StatusBadge } from "./shared-components";
import {
  fmt,
  fmtDateTime,
  exportInventoryExcel,
  exportInventoryPdf,
  type ExportColumnSpec,
} from "@/lib/analytics-utils";
import { cn } from "@/lib/utils";
import { INVENTORY_COLUMNS, DEFAULT_VISIBLE_COLUMNS } from "./column-defs";
import { ColumnConfigModal } from "./column-config-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParam } from "@/hooks/useQueryParam";

const PRICE_CURRENCY_COLUMNS = new Set<InventoryColumnKey>([
  "initialPriceDisplay",
  "priceWithMarginNoVat",
  "vatUa",
  "vatPl",
  "priceWithMarginWithVatUa",
  "priceWithMarginWithVatPl",
  "totalValue",
  "promotionPrice",
]);

const CURRENCIES = ["EUR", "UAH", "PLN"] as const;
type DisplayCurrency = (typeof CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  EUR: "€",
  UAH: "₴",
  PLN: "zł",
};

const PAGE_SIZES = [25, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

// Radix Select does not allow "" as an item value
const ALL = "__all__";

type Filters = {
  search: string;
  brand: string;
  category: string;
  badge: string;
  visibility: "" | "visible" | "hidden";
  stock: "" | "inStock" | "zero";
};

const EMPTY_FILTERS: Filters = {
  search: "",
  brand: "",
  category: "",
  badge: "",
  visibility: "",
  stock: "",
};

const LS_KEY = "analytics_inventory_columns";

function loadVisibleFromStorage(): Set<InventoryColumnKey> {
  if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE_COLUMNS);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set(DEFAULT_VISIBLE_COLUMNS);
    const parsed: InventoryColumnKey[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set(DEFAULT_VISIBLE_COLUMNS);
  }
}

function buildParams(opts: {
  warehouseId: string;
  currency: string;
  locale: string;
  filters: Filters;
  columns: InventoryColumnKey[];
  page?: number;
  pageSize?: number;
  all?: boolean;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (opts.warehouseId) params.set("warehouseId", opts.warehouseId);
  params.set("currency", opts.currency);
  params.set("locale", opts.locale);
  for (const [key, value] of Object.entries(opts.filters)) {
    if (value) params.set(key, value);
  }
  params.set("columns", opts.columns.join(","));
  if (opts.all) {
    params.set("all", "1");
  } else {
    params.set("page", String(opts.page ?? 1));
    params.set("pageSize", String(opts.pageSize ?? DEFAULT_PAGE_SIZE));
  }
  return params;
}

function rawValue(
  row: InventoryReportData["rows"][number],
  key: InventoryColumnKey,
): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

function formatCell(
  row: InventoryReportData["rows"][number],
  col: InventoryColumnDef,
): string {
  const v = rawValue(row, col.key);
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    if (col.format === "integer") return String(v);
    if (col.format === "percent") return `${v.toFixed(1)}%`;
    return fmt(v);
  }
  if (col.format === "date" && typeof v === "string") return fmtDateTime(v);
  return String(v);
}

export function InventoryTab() {
  const t = useTranslations("adminDashboard.analytics");
  const ti = useTranslations("adminDashboard.analytics.inventory");
  const locale = useLocale();

  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const [queryCurrency, setQueryCurrency] = useQueryParam("currency", "EUR");
  const [queryWarehouse, setQueryWarehouse] = useQueryParam("warehouse", "");

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const [visibleColumns, setVisibleColumns] = useState<Set<InventoryColumnKey>>(
    () => loadVisibleFromStorage(),
  );

  // Ordered list of active column defs (for table and exports)
  const activeColumns = useMemo(
    () => INVENTORY_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns],
  );
  const activeColumnKeys = useMemo(
    () => activeColumns.map((c) => c.key),
    [activeColumns],
  );

  // Debounce the search box into the filters
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === filters.search) return;
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, search: trimmed }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput, filters.search]);

  const queryString = buildParams({
    warehouseId: queryWarehouse,
    currency: queryCurrency,
    locale,
    filters,
    columns: activeColumnKeys,
    page,
    pageSize,
  }).toString();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/admin/analytics/inventory?${queryString}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json() as Promise<InventoryReportData>;
      })
      .then(setData)
      .catch(() => {
        if (controller.signal.aborted) return;
        toast.error("Error", {
          description: "Failed to load inventory report",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [queryString]);

  const handleColumnsChange = (next: Set<InventoryColumnKey>) => {
    setVisibleColumns(next);
    localStorage.setItem(LS_KEY, JSON.stringify([...next]));
  };

  const handleWarehouseChange = (value: string) => {
    setQueryWarehouse(value === ALL ? "" : value);
    setPage(1);
  };

  const handleCurrencyChange = (currency: DisplayCurrency) => {
    setQueryCurrency(currency);
  };

  const setFilter = <K extends keyof Filters>(key: K, value: string) => {
    setFilters((f) => ({ ...f, [key]: value === ALL ? "" : value }));
    setPage(1);
  };

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    Object.values(filters).some((v) => v !== "");

  const resetFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  // Column specs with translated labels for exports
  const exportSpecs: ExportColumnSpec[] = activeColumns.map((c) => ({
    key: c.key,
    label: ti(`columns.${c.key}`),
    format: c.format,
  }));

  // Exports cover every filtered row, not just the current page
  const handleExport = async (kind: "excel" | "pdf") => {
    setExporting(kind);
    try {
      const params = buildParams({
        warehouseId: queryWarehouse,
        currency: queryCurrency,
        locale,
        filters,
        columns: activeColumnKeys,
        all: true,
      });
      const res = await fetch(`/api/admin/analytics/inventory?${params}`);
      if (!res.ok) throw new Error("Failed");
      const full: InventoryReportData = await res.json();
      if (kind === "excel") {
        exportInventoryExcel(full, "Inventory_Report", exportSpecs);
      } else {
        await exportInventoryPdf(full, "Inventory_Report", exportSpecs);
      }
    } catch {
      toast.error(kind === "pdf" ? "PDF export failed" : "Excel export failed");
    } finally {
      setExporting(null);
    }
  };

  const pagination = data?.pagination;
  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.totalPages ?? 1;
  const rangeFrom =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.pageSize + 1
      : 0;
  const rangeTo = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters & actions */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("warehouseFilter")}
              </label>
              <Select
                value={queryWarehouse === "" ? ALL : queryWarehouse}
                onValueChange={handleWarehouseChange}
              >
                <SelectTrigger className="min-w-[120px] h-9 text-sm">
                  <SelectValue placeholder={ti("allWarehouses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{ti("allWarehouses")}</SelectItem>
                  {data?.warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("currencyFilter")}
              </label>
              <Select value={queryCurrency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="min-w-[120px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c} {CURRENCY_SYMBOLS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex flex-wrap gap-2">
              <ColumnConfigModal
                visible={visibleColumns}
                onChange={handleColumnsChange}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("excel")}
                disabled={!data || exporting !== null}
              >
                {exporting === "excel" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {t("export.excel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExport("pdf")}
                disabled={!data || exporting !== null}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {t("export.pdf")}
              </Button>
            </div>
          </div>

          {/* Table filters */}
          <div className="flex flex-wrap items-end gap-4 border-t pt-4">
            <div className="flex flex-col gap-1 min-w-[220px] flex-1 max-w-sm">
              <label className="text-sm text-muted-foreground">
                {ti("filters.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={ti("filters.searchPlaceholder")}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("filters.brand")}
              </label>
              <Select
                value={filters.brand || ALL}
                onValueChange={(v) => setFilter("brand", v)}
              >
                <SelectTrigger className="min-w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{ti("filters.allBrands")}</SelectItem>
                  {data?.filterOptions.brands.map((b) => (
                    <SelectItem key={b.alias} value={b.alias}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("filters.category")}
              </label>
              <Select
                value={filters.category || ALL}
                onValueChange={(v) => setFilter("category", v)}
              >
                <SelectTrigger className="min-w-[180px] max-w-[260px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {ti("filters.allCategories")}
                  </SelectItem>
                  {data?.filterOptions.categories.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                      className={cn(c.parentSlug ? "pl-8" : "font-medium")}
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("filters.badge")}
              </label>
              <Select
                value={filters.badge || ALL}
                onValueChange={(v) => setFilter("badge", v)}
              >
                <SelectTrigger className="min-w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{ti("filters.allBadges")}</SelectItem>
                  {data?.filterOptions.badges.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("filters.visibility")}
              </label>
              <Select
                value={filters.visibility || ALL}
                onValueChange={(v) => setFilter("visibility", v)}
              >
                <SelectTrigger className="min-w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{ti("filters.all")}</SelectItem>
                  <SelectItem value="visible">
                    {ti("filters.visible")}
                  </SelectItem>
                  <SelectItem value="hidden">{ti("filters.hidden")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("filters.stock")}
              </label>
              <Select
                value={filters.stock || ALL}
                onValueChange={(v) => setFilter("stock", v)}
              >
                <SelectTrigger className="min-w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{ti("filters.all")}</SelectItem>
                  <SelectItem value="inStock">
                    {ti("filters.inStock")}
                  </SelectItem>
                  <SelectItem value="zero">{ti("filters.zeroStock")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9"
                onClick={resetFilters}
              >
                <X className="h-4 w-4 mr-1" />
                {ti("filters.reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Summary cards — over all filtered rows */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label={ti("totalItems")}
              value={data.summary.totalProducts}
              icon={<PackageOpen className="h-5 w-5" />}
            />
            <SummaryCard
              label={ti("totalValue")}
              value={fmt(data.summary.totalStockValue)}
              icon={<Warehouse className="h-5 w-5" />}
            />
            <SummaryCard
              label={ti("zeroStock")}
              value={data.summary.zeroStockCount}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          {/* Inventory table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {ti("summary")}
                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "space-y-4 transition-opacity",
                loading && "opacity-60 pointer-events-none",
              )}
            >
              {data.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <div className="w-full">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="border-b">
                        {activeColumns.map((col) => (
                          <TableHead
                            key={col.key}
                            className={cn(
                              "py-2 pr-3 font-medium",
                              "whitespace-normal break-words",
                              col.numeric ? "text-right" : "text-left",
                            )}
                          >
                            {ti(`columns.${col.key}`)}
                            {PRICE_CURRENCY_COLUMNS.has(col.key) && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                (
                                {CURRENCY_SYMBOLS[
                                  data.displayCurrency as DisplayCurrency
                                ] ?? data.displayCurrency}
                                )
                              </span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row, idx) => (
                        <TableRow
                          key={`${row.itemSlug}-${row.warehouseId}`}
                          className={cn(
                            "border-b last:border-0",
                            idx % 2 === 0 && "bg-gray-50/50",
                          )}
                        >
                          {activeColumns.map((col) => {
                            if (col.key === "badge") {
                              return (
                                <TableCell key={col.key} className="py-2 pr-3">
                                  <StatusBadge status={row.badge} />
                                </TableCell>
                              );
                            }
                            const isZeroQty =
                              col.key === "quantity" && row.quantity === 0;
                            const text = formatCell(row, col);
                            return (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  "py-2 pr-3",
                                  col.numeric ? "text-right" : "text-left",
                                  col.key === "articleId" &&
                                    "font-mono text-xs",
                                  isZeroQty && "text-red-600 font-medium",
                                  col.truncate && "max-w-[240px] truncate",
                                )}
                                title={col.truncate ? text : undefined}
                              >
                                {text}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {ti("pagination.shown", {
                      from: rangeFrom,
                      to: rangeTo,
                      total: pagination.total,
                    })}
                  </span>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {ti("pagination.pageSize")}
                      </span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={handlePageSizeChange}
                      >
                        <SelectTrigger className="h-8 w-[80px] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZES.map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(1)}
                        aria-label={ti("pagination.first")}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={currentPage <= 1}
                        onClick={() => setPage(currentPage - 1)}
                        aria-label={ti("pagination.previous")}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 whitespace-nowrap">
                        {ti("pagination.pageOf", {
                          page: currentPage,
                          totalPages,
                        })}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(currentPage + 1)}
                        aria-label={ti("pagination.next")}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage(totalPages)}
                        aria-label={ti("pagination.last")}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
