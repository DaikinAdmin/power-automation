import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const warehouseCountriesData = [
  { slug: "ukraine", countryCode: "UA", phoneCode: "+380", name: "Ukraine" },
  { slug: "poland", countryCode: "PL", phoneCode: "+48", name: "Poland" },
  { slug: "spain", countryCode: "ES", phoneCode: "+34", name: "Spain" },
  { slug: "usa", countryCode: "US", phoneCode: "+1", name: "United States" },
  { slug: "germany", countryCode: "DE", phoneCode: "+49", name: "Germany" },
  { slug: "france", countryCode: "FR", phoneCode: "+33", name: "France" },
  { slug: "uk", countryCode: "GB", phoneCode: "+44", name: "United Kingdom" },
  { slug: "other", countryCode: "XX", phoneCode: null, name: "Other" },
];

async function seedWarehouseCountries() {
  try {
    console.log("Seeding warehouse_countries table...");
    
    for (const country of warehouseCountriesData) {
      const existing = await db
        .select()
        .from(schema.warehouseCountries)
        .where(eq(schema.warehouseCountries.slug, country.slug));
      
      if (existing.length === 0) {
        await db.insert(schema.warehouseCountries).values(country);
        console.log(`✅ Created country: ${country.name} (${country.slug})`);
      } else {
        console.log(`⏭️  Country already exists: ${country.name} (${country.slug})`);
      }
    }
    
    console.log("\n✅ Warehouse countries seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding warehouse countries:", error);
  } finally {
    process.exit(0);
  }
}

seedWarehouseCountries();
