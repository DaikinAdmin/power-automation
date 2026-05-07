"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  RefreshCw,
  FileDown,
  ShoppingCart,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryCard, StatusBadge } from "./shared-components";
import { cn } from "@/lib/utils";
import type { FinancialReportData } from "@/types/analytics";
import {
  fmt,
  monthLabel,
  exportFinancialExcel,
  exportFinancialPdf,
} from "@/lib/analytics-utils";
import { useQueryState } from "@/hooks/useQueryParam";



export function FinancialTab() {
  const t = useTranslations("adminDashboard.analytics");
  const tf = useTranslations("adminDashboard.analytics.financial");

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString()
    .slice(0, 10);

  const [data, setData] = useState<FinancialReportData | null>(null);
  const [dateFrom, setDateFrom] = useQueryState("from", {
    defaultValue: defaultFrom,
  });

  const [dateTo, setDateTo] = useQueryState("to", {
    defaultValue: today,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/analytics/financial?from=${from}&to=${to}`,
      );
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      toast.error("Error", { description: "Failed to load financial report" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(dateFrom, dateTo);
  }, []);

  const handleExportExcel = () => {
    if (!data) return;
    exportFinancialExcel(data, "Financial_Report");
  };

  const handleExportPdf = () => {
    if (!data) return;
    exportFinancialPdf(data, "Financial_Report").catch(() =>
      toast.error("PDF export failed"),
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {t("filters.dateFrom")}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">
                {t("filters.dateTo")}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={() => load(dateFrom, dateTo)}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              {t("filters.apply")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDateFrom(defaultFrom);
                setDateTo(today);
                load(defaultFrom, today);
              }}
              disabled={loading}
            >
              {t("filters.reset")}
            </Button>
            <div className="ml-auto flex gap-2">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard
              label={tf("totalOrders")}
              value={data.summary.totalOrders}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <SummaryCard
              label={tf("totalNet")}
              value={fmt(data.summary.totalNet)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <SummaryCard
              label={tf("totalVat")}
              value={fmt(data.summary.totalVat)}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <SummaryCard
              label={tf("totalGross")}
              value={fmt(data.summary.totalGross)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <SummaryCard
              label={tf("avgOrder")}
              value={fmt(data.summary.avgOrderValue)}
              icon={<BarChart3 className="h-5 w-5" />}
            />
          </div>

          {/* By status table */}
          <Card>
            <CardHeader>
              <CardTitle>{tf("byStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">
                          {tf("status")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("count")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("net")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("vat")}
                        </th>
                        <th className="text-right py-2 font-medium">
                          {tf("gross")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byStatus.map((row) => (
                        <tr key={row.status} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="text-right py-2 pr-4">{row.count}</td>
                          <td className="text-right py-2 pr-4">
                            {fmt(row.totalNet)}
                          </td>
                          <td className="text-right py-2 pr-4">
                            {fmt(row.totalVat)}
                          </td>
                          <td className="text-right py-2 font-medium">
                            {fmt(row.totalGross)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend table */}
          <Card>
            <CardHeader>
              <CardTitle>{tf("monthly")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthly.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium">
                          {tf("month")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("orders")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("net")}
                        </th>
                        <th className="text-right py-2 pr-4 font-medium">
                          {tf("vat")}
                        </th>
                        <th className="text-right py-2 font-medium">
                          {tf("gross")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((row) => (
                        <tr
                          key={`${row.year}-${row.month}`}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-4 font-mono">
                            {monthLabel(row.year, row.month)}
                          </td>
                          <td className="text-right py-2 pr-4">
                            {row.totalOrders}
                          </td>
                          <td className="text-right py-2 pr-4">
                            {fmt(row.totalNet)}
                          </td>
                          <td className="text-right py-2 pr-4">
                            {fmt(row.totalVat)}
                          </td>
                          <td className="text-right py-2 font-medium">
                            {fmt(row.totalGross)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
