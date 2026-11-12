import { and, eq } from 'drizzle-orm';
import type { db } from '@/db';
import * as schema from '@/db/schema';
import type { OrderLineItem } from '@/app/api/orders/shared';

// Stock bookkeeping for orders. Every line item carries `stockDeducted` —
// how many units this order currently holds out of itemPrice.quantity at the
// line's warehouse. It is the single source of truth for what may be given
// back: lines from before stock deduction existed have it undefined, so
// cancelling such an order never "returns" units that were never taken, and
// a line whose stock was already returned (0) can't be returned twice.
//
// All helpers take an executor so callers can run them inside the same
// transaction that writes the order row.
export type StockExecutor = Pick<typeof db, 'select' | 'update'>;

// Statuses in which an order holds no stock: a cancelled order (once its
// stock was returned) and a price request (never a confirmed purchase).
// Moving an order out of one of these re-reserves its tracked lines.
const NON_HOLDING_STATUSES = new Set<string>(['CANCELLED', 'ASK_FOR_PRICE']);

export const orderHoldsStock = (status: string | null | undefined): boolean =>
  !NON_HOLDING_STATUSES.has(status ?? '');

export const hasDeductedStock = (lineItems: OrderLineItem[] | null | undefined): boolean =>
  Array.isArray(lineItems) && lineItems.some((li) => (li.stockDeducted ?? 0) > 0);

async function lockPriceRow(ex: StockExecutor, itemSlug: string, warehouseId: string) {
  const [row] = await ex
    .select({ id: schema.itemPrice.id, quantity: schema.itemPrice.quantity })
    .from(schema.itemPrice)
    .where(and(eq(schema.itemPrice.itemSlug, itemSlug), eq(schema.itemPrice.warehouseId, warehouseId)))
    .limit(1)
    .for('update');
  return row ?? null;
}

/**
 * Takes `quantity` units out of a warehouse's stock for an item.
 * - 'strict' (storefront checkout): all or nothing — returns null and changes
 *   nothing when there isn't enough stock.
 * - 'lenient' (admin edits, which may knowingly oversell): takes whatever is
 *   available, never driving stock below zero.
 * Returns the number of units actually deducted.
 */
export async function deductStock(
  ex: StockExecutor,
  itemSlug: string,
  warehouseId: string,
  quantity: number,
  mode: 'strict' | 'lenient',
): Promise<number | null> {
  if (quantity <= 0) return 0;
  const row = await lockPriceRow(ex, itemSlug, warehouseId);
  const available = Math.max(row?.quantity ?? 0, 0);
  if (mode === 'strict' && available < quantity) return null;
  const deducted = Math.min(available, quantity);
  if (row && deducted > 0) {
    await ex
      .update(schema.itemPrice)
      .set({ quantity: row.quantity - deducted, updatedAt: new Date().toISOString() })
      .where(eq(schema.itemPrice.id, row.id));
  }
  return deducted;
}

/**
 * Puts `quantity` units back. Returns false when the item is no longer
 * carried by that warehouse (no price row to return the units to).
 */
export async function restoreStock(
  ex: StockExecutor,
  itemSlug: string,
  warehouseId: string,
  quantity: number,
): Promise<boolean> {
  if (quantity <= 0) return true;
  const row = await lockPriceRow(ex, itemSlug, warehouseId);
  if (!row) return false;
  await ex
    .update(schema.itemPrice)
    .set({ quantity: row.quantity + quantity, updatedAt: new Date().toISOString() })
    .where(eq(schema.itemPrice.id, row.id));
  return true;
}

// Lines from before the itemSlug field existed don't carry it — resolve it
// from itemId (always present).
export async function resolveLineItemSlug(ex: StockExecutor, line: OrderLineItem): Promise<string | null> {
  if (line.itemSlug) return line.itemSlug;
  const [row] = await ex
    .select({ slug: schema.item.slug })
    .from(schema.item)
    .where(eq(schema.item.id, line.itemId))
    .limit(1);
  return row?.slug ?? null;
}

export type StockRestoreResult = {
  lineItems: OrderLineItem[];
  restoredUnits: number;
  // Names of lines whose stock could not be returned because the catalog no
  // longer has that item at that warehouse.
  missing: string[];
};

/** Returns everything the given lines hold back to their warehouses. */
export async function restoreLineItemsStock(
  ex: StockExecutor,
  lineItems: OrderLineItem[],
): Promise<StockRestoreResult> {
  let restoredUnits = 0;
  const missing: string[] = [];
  const updated: OrderLineItem[] = [];
  for (const line of lineItems) {
    const held = line.stockDeducted ?? 0;
    if (held <= 0) {
      updated.push(line);
      continue;
    }
    const slug = await resolveLineItemSlug(ex, line);
    const ok = slug ? await restoreStock(ex, slug, line.warehouseId, held) : false;
    if (ok) restoredUnits += held;
    else missing.push(line.name);
    updated.push({ ...line, stockDeducted: 0 });
  }
  return { lineItems: updated, restoredUnits, missing };
}

export type StockReserveResult = {
  lineItems: OrderLineItem[];
  reservedUnits: number;
  // Names of lines that could not be fully covered by current stock.
  shortages: string[];
};

/**
 * Re-reserves stock for tracked lines (stockDeducted defined) up to their
 * quantity — used when an order leaves a non-holding status, e.g. a
 * cancellation whose stock was returned is undone. Untracked legacy lines
 * are left alone.
 */
export async function reserveLineItemsStock(
  ex: StockExecutor,
  lineItems: OrderLineItem[],
): Promise<StockReserveResult> {
  let reservedUnits = 0;
  const shortages: string[] = [];
  const updated: OrderLineItem[] = [];
  for (const line of lineItems) {
    const outstanding = line.stockDeducted == null ? 0 : (line.quantity ?? 0) - line.stockDeducted;
    if (outstanding <= 0) {
      updated.push(line);
      continue;
    }
    const slug = await resolveLineItemSlug(ex, line);
    const deducted = slug ? ((await deductStock(ex, slug, line.warehouseId, outstanding, 'lenient')) ?? 0) : 0;
    reservedUnits += deducted;
    if (deducted < outstanding) shortages.push(line.name);
    updated.push({ ...line, stockDeducted: (line.stockDeducted ?? 0) + deducted });
  }
  return { lineItems: updated, reservedUnits, shortages };
}
