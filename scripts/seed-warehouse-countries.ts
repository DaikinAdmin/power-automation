import 'dotenv/config';
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const warehouseCountriesData = [
  { slug: "ua", countryCode: "UA", phoneCode: "+380", name: "Ukraine" },
  { slug: "pl", countryCode: "PL", phoneCode: "+48", name: "Poland" },
  { slug: "es", countryCode: "ES", phoneCode: "+34", name: "Spain" },
  { slug: "us", countryCode: "US", phoneCode: "+1", name: "United States" },
  { slug: "de", countryCode: "DE", phoneCode: "+49", name: "Germany"  },
  { slug: "fr", countryCode: "FR", phoneCode: "+33", name: "France" },
  { slug: "gb", countryCode: "GB", phoneCode: "+44", name: "United Kingdom" },
  { slug: "other", countryCode: "XX", phoneCode: null, name: "Other" },
];

async function seedWarehouseCountries() {
  try {
    console.log("=".repeat(60));
    console.log("DATABASE CONNECTION INFO:");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("=".repeat(60));
    console.log("\nSeeding warehouse_countries table...");
    
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
