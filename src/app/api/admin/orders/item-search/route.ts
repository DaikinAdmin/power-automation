import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq, or, ilike, sql, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);
const RESULT_LIMIT = 15;

// Lightweight catalog search for the "add item to order" picker in admin
// order editing — distinct from the full /api/admin/items list (which is
// admin-only and built for the items-management page), so employees can use
// it too and it stays cheap for an inline autocomplete.
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1);
    if (!user?.role || !AUTHORIZED_ROLES.has(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }
    const term = `%${q.toLowerCase()}%`;

    const matchingSlugs = await db
      .selectDistinct({ slug: schema.item.slug })
      .from(schema.item)
      .leftJoin(schema.itemDetails, eq(schema.itemDetails.itemSlug, schema.item.slug))
      .where(
        or(
          ilike(schema.item.articleId, term),
          sql`LOWER(COALESCE(${schema.itemDetails.itemName}, '')) LIKE ${term}`,
        ),
      )
      .limit(RESULT_LIMIT);

    const slugs = matchingSlugs.map((r) => r.slug);
    if (slugs.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const [items, itemDetails, priceRows] = await Promise.all([
      db.select({ slug: schema.item.slug, articleId: schema.item.articleId }).from(schema.item).where(inArray(schema.item.slug, slugs)),
      db
        .select({ itemSlug: schema.itemDetails.itemSlug, itemName: schema.itemDetails.itemName, locale: schema.itemDetails.locale })
        .from(schema.itemDetails)
        .where(inArray(schema.itemDetails.itemSlug, slugs)),
      db
        .select({
          itemSlug: schema.itemPrice.itemSlug,
          warehouseId: schema.itemPrice.warehouseId,
          quantity: schema.itemPrice.quantity,
          warehouse: schema.warehouse,
        })
        .from(schema.itemPrice)
        .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
        .where(inArray(schema.itemPrice.itemSlug, slugs)),
    ]);

    const namesBySlug: Record<string, string> = {};
    for (const d of itemDetails) {
      if (!namesBySlug[d.itemSlug]) namesBySlug[d.itemSlug] = d.itemName;
    }

    const results = items.map((item) => ({
      itemSlug: item.slug,
      articleId: item.articleId,
      name: namesBySlug[item.slug] ?? item.articleId,
      warehouses: priceRows
        .filter((p) => p.itemSlug === item.slug && p.warehouse)
        .map((p) => ({
          id: p.warehouse!.id,
          label: p.warehouse!.displayedName || p.warehouse!.name || p.warehouse!.id,
          quantity: p.quantity,
        })),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
