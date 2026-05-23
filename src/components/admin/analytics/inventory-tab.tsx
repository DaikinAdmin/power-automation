"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileDown, Warehouse, PackageOpen, AlertTriangle } from "lucide-react";
import type {
  InventoryReportData,
  InventoryColumnKey,
} from "@/types/analytics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCard, StatusBadge } from "./shared-components";
import {
  fmt,
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
]);

const CURRENCIES = ["EUR", "UAH", "PLN"] as const;
type DisplayCurrency = (typeof CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  EUR: "€",
  UAH: "₴",
  PLN: "zł",
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

function formatCell(
  row: InventoryReportData["rows"][number],
  key: InventoryColumnKey,
  format?: "price" | "percent" | "integer",
): string {
  const v = (row as unknown as Record<string, unknown>)[key];
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (format === "integer") return String(v);
    if (format === "percent") return `${v.toFixed(1)}%`;
    return fmt(v);
  }
  return String(v);
}

export function InventoryTab() {
  const t = useTranslations("adminDashboard.analytics");
  const ti = useTranslations("adminDashboard.analytics.inventory");

  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const [queryCurrency, setQueryCurrency] = useQueryParam("currency", "EUR");
  const [queryWarehouse, setQueryWarehouse] = useQueryParam("warehouse", "");

  const [visibleColumns, setVisibleColumns] = useState<Set<InventoryColumnKey>>(
    () => loadVisibleFromStorage(),
  );

  const load = useCallback(
    async (warehouseId: string, currency: DisplayCurrency = "EUR") => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (warehouseId) params.set("warehouseId", warehouseId);
        params.set("currency", currency);
        const res = await fetch(
          `/api/admin/analytics/inventory?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed");
        setData(await res.json());
      } catch {
        toast.error("Error", {
          description: "Failed to load inventory report",
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(queryWarehouse, queryCurrency as DisplayCurrency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleColumnsChange = (next: Set<InventoryColumnKey>) => {
    setVisibleColumns(next);
    localStorage.setItem(LS_KEY, JSON.stringify([...next]));
  };

  const handleWarehouseChange = (value: string) => {
    const warehouseId = value === "__all__" ? "" : value;
    setQueryWarehouse(warehouseId);
    load(warehouseId, queryCurrency as DisplayCurrency);
  };

  const handleCurrencyChange = (currency: DisplayCurrency) => {
    setQueryCurrency(currency);
    load(queryWarehouse, currency);
  };

  // Ordered list of active column defs (for table and exports)
  const activeColumns = useMemo(
    () => INVENTORY_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns],
  );

  // Column specs with translated labels for exports
  const exportSpecs: ExportColumnSpec[] = activeColumns.map((c) => ({
    key: c.key,
    label: ti(`columns.${c.key}`),
    format: c.format,
  }));

  const handleExportExcel = () => {
    if (!data) return;
    exportInventoryExcel(data, "Inventory_Report", exportSpecs);
  };

  const handleExportPdf = () => {
    if (!data) return;
    exportInventoryPdf(data, "Inventory_Report", exportSpecs).catch(() =>
      toast.error("PDF export failed"),
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & actions */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {ti("warehouseFilter")}
              </label>
              <Select
                value={queryWarehouse === "" ? "__all__" : queryWarehouse}
                onValueChange={handleWarehouseChange}
                disabled={loading}
              >
                <SelectTrigger className="min-w-[120px] h-9 text-sm">
                  <SelectValue placeholder={ti("allWarehouses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{ti("allWarehouses")}</SelectItem>
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
              <Select
                value={queryCurrency}
                onValueChange={handleCurrencyChange}
                disabled={loading}
              >
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
                onClick={handleExportExcel}
                disabled={!data}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {t("export.excel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPdf}
                disabled={!data}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {t("export.pdf")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
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
              <CardTitle>{ti("summary")}</CardTitle>
            </CardHeader>
            <CardContent>
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
                            {PRICE_CURRENCY_COLUMNS.has(col.key) && data && (
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
                            return (
                              <TableCell
                                key={col.key}
                                className={cn(
                                  "py-2 pr-3",
                                  col.numeric ? "text-right" : "text-left",
                                  col.key === "articleId" &&
                                    "font-mono text-xs",
                                  isZeroQty && "text-red-600 font-medium",
                                  (col.key === "namesPl" ||
                                    col.key === "namesUa" ||
                                    col.key === "namesEn" ||
                                    col.key === "namesEs") &&
                                    "max-w-[200px] truncate",
                                )}
                                title={
                                  col.key === "namesPl" ||
                                  col.key === "namesUa" ||
                                  col.key === "namesEn" ||
                                  col.key === "namesEs"
                                    ? ((
                                        row as unknown as Record<
                                          string,
                                          unknown
                                        >
                                      )[col.key] as string)
                                    : undefined
                                }
                              >
                                {" "}
                                {formatCell(row, col.key, col.format)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
