import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { apiErrorHandler } from "@/lib/error-handler";
import type {
  FinancialReportData,
  FinancialByWarehouseRow,
  FinancialGranularity,
} from "@/types/analytics";
import { getDomainKeyByHost } from "@/lib/domain-config";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);
const VALID_GRANULARITIES = new Set<FinancialGranularity>(["day", "week", "month"]);

type RawWarehouseAggRow = {
  warehouse_id: string | null;
  order_count: string;
  total_net: string;
  total_profit_raw: string;
  lines_missing_cost: string;
  lines_total: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const host = request.headers.get("host") || "";
    const domainKey = getDomainKeyByHost(host);
    const currency =
      domainKey === "ua" ? "UAH" : domainKey === "pl" ? "PLN" : "";

    const [user] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user?.role || !AUTHORIZED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const dateFrom =
      searchParams.get("from") ?? defaultFrom.toISOString().slice(0, 10);
    const dateTo = searchParams.get("to") ?? now.toISOString().slice(0, 10);

    const rawGranularity = searchParams.get("granularity");
    const granularity: FinancialGranularity = VALID_GRANULARITIES.has(
      rawGranularity as FinancialGranularity,
    )
      ? (rawGranularity as FinancialGranularity)
      : "month";

    const fromTs = `${dateFrom}T00:00:00.000Z`;
    const toTs = `${dateTo}T23:59:59.999Z`;

    const filters = and(
      eq(schema.order.currency, currency),
      gte(schema.order.createdAt, fromTs),
      lte(schema.order.createdAt, toTs),
    );

    // Summary
    const [summaryRow] = await db
      .select({
        totalOrders: sql<number>`cast(count(*) as integer)`,
        totalNet: sql<number>`cast(coalesce(sum(${schema.order.totalNet}), 0) as double precision)`,
        totalVat: sql<number>`cast(coalesce(sum(${schema.order.totalVat}), 0) as double precision)`,
        totalGross: sql<number>`cast(coalesce(sum(${schema.order.totalGross}), 0) as double precision)`,
      })
      .from(schema.order)
      .where(filters);

    const avgOrderValue =
      summaryRow.totalOrders > 0
        ? summaryRow.totalGross / summaryRow.totalOrders
        : 0;

    // By status
    const byStatus = await db
      .select({
        status: schema.order.status,
        count: sql<number>`cast(count(*) as integer)`,
        totalNet: sql<number>`cast(coalesce(sum(${schema.order.totalNet}), 0) as double precision)`,
        totalVat: sql<number>`cast(coalesce(sum(${schema.order.totalVat}), 0) as double precision)`,
        totalGross: sql<number>`cast(coalesce(sum(${schema.order.totalGross}), 0) as double precision)`,
      })
      .from(schema.order)
      .where(filters)
      .groupBy(schema.order.status);

    // Trend, bucketed by the requested granularity (day/week/month).
    // date_trunc's first arg is passed via sql.raw, not as a bind parameter —
    // Postgres can't infer a bind param's type in that position (fails with
    // "Failed query" / type-inference error), and granularity is already
    // whitelist-validated above so there's no injection risk in inlining it.
    const dateTrunc = sql.raw(`date_trunc('${granularity}', "order"."createdAt"::timestamp)`);
    const trendRows = await db
      .select({
        period: sql<string>`to_char(${dateTrunc}, 'YYYY-MM-DD')`,
        totalOrders: sql<number>`cast(count(*) as integer)`,
        totalNet: sql<number>`cast(coalesce(sum(${schema.order.totalNet}), 0) as double precision)`,
        totalVat: sql<number>`cast(coalesce(sum(${schema.order.totalVat}), 0) as double precision)`,
        totalGross: sql<number>`cast(coalesce(sum(${schema.order.totalGross}), 0) as double precision)`,
      })
      .from(schema.order)
      .where(filters)
      .groupBy(dateTrunc)
      .orderBy(dateTrunc);

    // By-warehouse net + profit, aggregated over the jsonb lineItems array.
    // Profit only counts lines that carry a costPriceNet snapshot (see
    // src/app/api/orders/shared.ts) — lines from before that field existed,
    // or whose catalog row never had an initialPrice, are excluded from the
    // sum and tracked separately via linesMissingCost/linesTotal so the UI
    // can show a coverage % instead of a silently-wrong total.
    const warehouseAggRaw = await db.execute(sql`
      select
        li->>'warehouseId' as warehouse_id,
        count(distinct o.id) as order_count,
        sum(coalesce((li->>'unitPriceNet')::numeric, 0) * coalesce((li->>'quantity')::numeric, 0) * coalesce((li->>'exchangeRate')::numeric, 1)) as total_net,
        sum(
          case when (li->>'costPriceNet') is not null
            then (coalesce((li->>'unitPriceNet')::numeric, 0) - (li->>'costPriceNet')::numeric) * coalesce((li->>'quantity')::numeric, 0) * coalesce((li->>'exchangeRate')::numeric, 1)
            else 0 end
        ) as total_profit_raw,
        count(*) filter (where (li->>'costPriceNet') is null) as lines_missing_cost,
        count(*) as lines_total
      from "order" o, jsonb_array_elements(o."lineItems") as li
      where o.currency = ${currency} and o."createdAt" between ${fromTs} and ${toTs}
      group by li->>'warehouseId'
    `);
    const warehouseAggRows = (warehouseAggRaw as unknown as { rows: RawWarehouseAggRow[] }).rows;

    const warehouseIds = warehouseAggRows
      .map((r) => r.warehouse_id)
      .filter((id): id is string => !!id);

    const warehouseNameRows =
      warehouseIds.length > 0
        ? await db
            .select({
              id: schema.warehouse.id,
              name: schema.warehouse.name,
              displayedName: schema.warehouse.displayedName,
            })
            .from(schema.warehouse)
        : [];
    const warehouseNameMap: Record<string, string> = {};
    for (const w of warehouseNameRows) {
      warehouseNameMap[w.id] = w.displayedName || w.name || w.id;
    }

    const byWarehouse: FinancialByWarehouseRow[] = warehouseAggRows.map((r) => {
      const linesTotal = parseInt(r.lines_total, 10) || 0;
      const linesMissingCost = parseInt(r.lines_missing_cost, 10) || 0;
      const linesWithCost = linesTotal - linesMissingCost;
      const profitCoveragePercent = linesTotal > 0 ? (linesWithCost / linesTotal) * 100 : 0;
      return {
        warehouseId: r.warehouse_id ?? "unknown",
        warehouseName: r.warehouse_id ? (warehouseNameMap[r.warehouse_id] ?? r.warehouse_id) : "—",
        orderCount: parseInt(r.order_count, 10) || 0,
        totalNet: +(parseFloat(r.total_net) || 0).toFixed(2),
        totalProfit: linesWithCost > 0 ? +(parseFloat(r.total_profit_raw) || 0).toFixed(2) : null,
        profitCoveragePercent: +profitCoveragePercent.toFixed(1),
      };
    });

    // Overall coverage/profit, computed directly from the raw rows (not the
    // rounded per-warehouse ones) for accuracy.
    let sumLinesTotal = 0;
    let sumLinesWithCost = 0;
    let sumProfit = 0;
    for (const r of warehouseAggRows) {
      const linesTotal = parseInt(r.lines_total, 10) || 0;
      const linesMissingCost = parseInt(r.lines_missing_cost, 10) || 0;
      sumLinesTotal += linesTotal;
      sumLinesWithCost += linesTotal - linesMissingCost;
      sumProfit += parseFloat(r.total_profit_raw) || 0;
    }
    const profitCoveragePercent = sumLinesTotal > 0 ? +((sumLinesWithCost / sumLinesTotal) * 100).toFixed(1) : 0;
    const totalProfit = sumLinesWithCost > 0 ? +sumProfit.toFixed(2) : null;

    const data: FinancialReportData = {
      summary: {
        totalOrders: summaryRow.totalOrders,
        totalNet: summaryRow.totalNet,
        totalVat: summaryRow.totalVat,
        totalGross: summaryRow.totalGross,
        avgOrderValue,
        totalProfit,
        profitCoveragePercent,
      },
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r.count,
        totalNet: r.totalNet,
        totalVat: r.totalVat,
        totalGross: r.totalGross,
      })),
      trend: trendRows.map((r) => ({
        period: r.period,
        totalOrders: r.totalOrders,
        totalNet: r.totalNet,
        totalVat: r.totalVat,
        totalGross: r.totalGross,
      })),
      byWarehouse: byWarehouse.sort((a, b) => b.totalNet - a.totalNet),
      granularity,
      dateFrom,
      dateTo,
    };

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorHandler(error, "GET /api/admin/analytics/financial");
  }
}
