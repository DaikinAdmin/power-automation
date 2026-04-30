/**
 * Server-side currency conversion utility.
 *
 * Reads exchange rates directly from the `currency_exchange` table — the same
 * table that backs the existing GET /api/admin/currency-exchange endpoint.
 *
 * Use this in API routes (server-side only). For client-side use see useCurrency hook.
 *
 * The base (store) currency is EUR. All order.originalTotalPrice values are in EUR.
 */

import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { convertPriceValue } from '@/helpers/currency';

/** The store's base currency — all order prices are stored in this. */
export const BASE_CURRENCY = 'EUR' as const;

/**
 * Fetches the exchange rate between two currencies from the database.
 *
 * Uses the same `currency_exchange` table that the admin currency-exchange API reads from.
 * Throws if no rate is found — this forces an explicit rate to be configured in the admin panel
 * rather than silently charging the wrong amount.
 *
 * @param from  Source currency (e.g. 'EUR')
 * @param to    Target currency (e.g. 'PLN' | 'UAH')
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const [record] = await db
    .select({ rate: schema.currencyExchange.rate })
    .from(schema.currencyExchange)
    .where(
      and(
        eq(schema.currencyExchange.from, from as any),
        eq(schema.currencyExchange.to, to as any)
      )
    )
    .limit(1);

  if (!record?.rate || !Number.isFinite(record.rate) || record.rate <= 0) {
    throw new Error(
      `Exchange rate ${from} → ${to} not found in database. ` +
      `Please configure it in the admin panel (Settings → Currency Exchange).`
    );
  }

  return record.rate;
}
