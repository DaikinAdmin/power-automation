import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";

const AUTHORIZED_ROLES = new Set(["admin", "employee"]);

// Lists the warehouses that currently carry a given order line's item, for
// the "change warehouse" picker in admin order editing. Keyed by itemId
// (always present on every line, unlike itemSlug which only exists on
// orders placed after that field was added) so the picker works for every
// order regardless of age.
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
    const itemId = searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const [itemRow] = await db
      .select({ slug: schema.item.slug })
      .from(schema.item)
      .where(eq(schema.item.id, itemId))
      .limit(1);
    if (!itemRow) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const priceRows = await db
      .select({
        warehouseId: schema.itemPrice.warehouseId,
        quantity: schema.itemPrice.quantity,
        price: schema.itemPrice.price,
        warehouse: schema.warehouse,
      })
      .from(schema.itemPrice)
      .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
      .where(eq(schema.itemPrice.itemSlug, itemRow.slug));

    const warehouses = priceRows
      .filter((r) => r.warehouse)
      .map((r) => ({
        id: r.warehouse!.id,
        label: r.warehouse!.displayedName || r.warehouse!.name || r.warehouse!.id,
        quantity: r.quantity,
      }));

    return NextResponse.json({ itemSlug: itemRow.slug, warehouses });
  } catch (error) {
    console.error("Error fetching line-item warehouses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
