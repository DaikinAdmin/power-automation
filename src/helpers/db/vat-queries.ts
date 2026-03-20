import { db } from '@/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

/**
 * Get VAT percentage for a country by its country code.
 * Returns 0 if not found.
 */
export async function getVatByCountryCode(countryCode: string): Promise<number> {
  const [country] = await db
    .select({ vatPercentage: schema.warehouseCountries.vatPercentage })
    .from(schema.warehouseCountries)
    .where(eq(schema.warehouseCountries.countryCode, countryCode))
    .limit(1);

  return country?.vatPercentage ?? 0;
}
