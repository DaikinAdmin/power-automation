import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, gte, lte, and, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { apiErrorHandler } from '@/lib/error-handler';
import type { FinancialReportData } from '@/types/analytics';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);

    if (!user?.role || !AUTHORIZED_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const dateFrom = searchParams.get('from') ?? defaultFrom.toISOString().slice(0, 10);
    const dateTo = searchParams.get('to') ?? now.toISOString().slice(0, 10);

    const fromTs = `${dateFrom}T00:00:00.000Z`;
    const toTs = `${dateTo}T23:59:59.999Z`;

    const filters = and(
      gte(schema.order.createdAt, fromTs),
      lte(schema.order.createdAt, toTs)
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
      summaryRow.totalOrders > 0 ? summaryRow.totalGross / summaryRow.totalOrders : 0;

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

    // Monthly trend
    const monthly = await db
      .select({
        year: sql<number>`cast(extract(year from ${schema.order.createdAt}::timestamp) as integer)`,
        month: sql<number>`cast(extract(month from ${schema.order.createdAt}::timestamp) as integer)`,
        totalOrders: sql<number>`cast(count(*) as integer)`,
        totalNet: sql<number>`cast(coalesce(sum(${schema.order.totalNet}), 0) as double precision)`,
        totalVat: sql<number>`cast(coalesce(sum(${schema.order.totalVat}), 0) as double precision)`,
        totalGross: sql<number>`cast(coalesce(sum(${schema.order.totalGross}), 0) as double precision)`,
      })
      .from(schema.order)
      .where(filters)
      .groupBy(
        sql`extract(year from ${schema.order.createdAt}::timestamp)`,
        sql`extract(month from ${schema.order.createdAt}::timestamp)`
      )
      .orderBy(
        sql`extract(year from ${schema.order.createdAt}::timestamp)`,
        sql`extract(month from ${schema.order.createdAt}::timestamp)`
      );

    const data: FinancialReportData = {
      summary: {
        totalOrders: summaryRow.totalOrders,
        totalNet: summaryRow.totalNet,
        totalVat: summaryRow.totalVat,
        totalGross: summaryRow.totalGross,
        avgOrderValue,
      },
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r.count,
        totalNet: r.totalNet,
        totalVat: r.totalVat,
        totalGross: r.totalGross,
      })),
      monthly: monthly.map((r) => ({
        year: r.year,
        month: r.month,
        totalOrders: r.totalOrders,
        totalNet: r.totalNet,
        totalVat: r.totalVat,
        totalGross: r.totalGross,
      })),
      dateFrom,
      dateTo,
    };

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorHandler(error, 'GET /api/admin/analytics/financial');
  }
}
