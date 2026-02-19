import 'dotenv/config';
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const brandsData = [
  "Siemens",
  "Pilz",
  "ATLAS COPCO",
  "Schneider Electric",
  "Danfoss",
  "Daikin",
  "PHOENIX",
  "Harting",
  "MURRELEKTRONIK",
  "SICK",
  "Omron",
  "Unknown"
];

function createAlias(brandName: string): string {
  return brandName.toLowerCase().replace(/\s+/g, '-');
}

async function seedBrands() {
  try {
    console.log("=".repeat(60));
    console.log("DATABASE CONNECTION INFO:");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("=".repeat(60));
    console.log("\nSeeding brand table...");
    
    for (const brandName of brandsData) {
      const alias = createAlias(brandName);
      
      const existing = await db
        .select()
        .from(schema.brand)
        .where(eq(schema.brand.alias, alias));
      
      if (existing.length === 0) {
        await db.insert(schema.brand).values({
          name: brandName,
          alias: alias,
          imageLink: '/imgs/brands/default.png',
          isVisible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ Created brand: ${brandName} (${alias})`);
      } else {
        console.log(`⏭️  Brand already exists: ${brandName} (${alias})`);
      }
    }
    
    console.log("\n✅ Brand seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding brands:", error);
  } finally {
    process.exit(0);
  }
}

seedBrands();
