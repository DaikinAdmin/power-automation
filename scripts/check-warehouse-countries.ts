import { db } from "../src/db";
import * as schema from "../src/db/schema";

async function checkWarehouseCountries() {
  try {
    const countries = await db.select().from(schema.warehouseCountries);
    console.log("Available warehouse countries:");
    console.log(JSON.stringify(countries, null, 2));
  } catch (error) {
    console.error("Error checking warehouse countries:", error);
  } finally {
    process.exit(0);
  }
}

checkWarehouseCountries();
