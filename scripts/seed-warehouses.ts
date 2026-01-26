import 'dotenv/config';
import { db } from "../src/db";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const warehousesData = [
  { 
    id: "warehouse-1",
    name: "warehouse-1", 
    displayedName: "warehouse-1", 
    countrySlug: "pl",
    isVisible: true 
  },
  { 
    id: "warehouse-2",
    name: "warehouse-2", 
    displayedName: "warehouse-2", 
    countrySlug: "ua",
    isVisible: true 
  },
  { 
    id: "warehouse-3",
    name: "warehouse-3", 
    displayedName: "warehouse-3", 
    countrySlug: "es",
    isVisible: true 
  },
  { 
    id:"warehouse-4",
    name: "warehouse-4", 
    displayedName: "warehouse-4", 
    countrySlug: "other",
    isVisible: true 
  },
];

async function seedWarehouses() {
  try {
    console.log("=".repeat(60));
    console.log("DATABASE CONNECTION INFO:");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("=".repeat(60));
    console.log("\nSeeding warehouse table...");
    
    for (const warehouse of warehousesData) {
      // Check if warehouse already exists for this country
      const existing = await db
        .select()
        .from(schema.warehouse)
        .where(eq(schema.warehouse.countrySlug, warehouse.countrySlug!));
      
      if (existing.length === 0) {
        await db.insert(schema.warehouse).values({
          name: warehouse.name,
          displayedName: warehouse.displayedName,
          countrySlug: warehouse.countrySlug,
          isVisible: warehouse.isVisible,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ Created warehouse: ${warehouse.displayedName} for country ${warehouse.countrySlug}`);
      } else {
        console.log(`⏭️  Warehouse already exists for country: ${warehouse.countrySlug}`);
      }
    }
    
    console.log("\n✅ Warehouse seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding warehouses:", error);
  } finally {
    process.exit(0);
  }
}

seedWarehouses();
