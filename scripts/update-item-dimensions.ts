import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";
import pg from "pg";
import * as XLSX from "xlsx";
import * as path from "path";
import { item } from "../src/db/schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

interface ExcelDimensions {
  grossWeight: number | null; // always stored as grams
  widthPacking: number | null; // always stored as mm
  heightPacking: number | null; // always stored as mm
  lengthPacking: number | null; // always stored as mm
}

function readExcelDimensions(filePath: string): Map<string, ExcelDimensions> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // header: 1 => array of arrays, defval: null for empty cells
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  });

  if (rows.length === 0) {
    throw new Error("Excel file is empty");
  }

  // Find header row and column indices
  const headerRow = rows[0].map((h: any) =>
    h != null ? String(h).trim() : "",
  );

  const colArticle = headerRow.findIndex((h: string) =>
    /article|артикул|mlfb|order no/i.test(h),
  );
  const colGrossWeight = headerRow.findIndex((h: string) =>
    /gross\s*weight/i.test(h),
  );
  const colUnitWeight = headerRow.findIndex((h: string) =>
    /unit\s*(of\s*)?weight/i.test(h),
  );
  const colWidth = headerRow.findIndex((h: string) =>
    /width\s*packing/i.test(h),
  );
  const colHeight = headerRow.findIndex((h: string) =>
    /height\s*packing/i.test(h),
  );
  const colLength = headerRow.findIndex((h: string) =>
    /length\s*packing/i.test(h),
  );
  const colUnitPacking = headerRow.findIndex((h: string) =>
    /unit\s*packing/i.test(h),
  );

  console.log("Header row:", headerRow);
  console.log(
    `Column indices — article: ${colArticle}, grossWeight: ${colGrossWeight}, unitWeight: ${colUnitWeight}, ` +
      `width: ${colWidth}, height: ${colHeight}, length: ${colLength}, unitPacking: ${colUnitPacking}`,
  );
  if (colUnitWeight === -1)
    console.warn(
      'Warning: "Unit of weight" column not found — assuming kg for all rows',
    );
  if (colUnitPacking === -1)
    console.warn(
      'Warning: "Unit packing" column not found — assuming mm for all rows',
    );

  if (colArticle === -1) {
    throw new Error(
      "Could not find article column in Excel. Headers found: " +
        headerRow.join(", "),
    );
  }
  if (
    colGrossWeight === -1 ||
    colWidth === -1 ||
    colHeight === -1 ||
    colLength === -1
  ) {
    throw new Error(
      'Could not find one or more dimension columns. Expected: "Gross weight", "Width packing", "Height packing", "Length packing"',
    );
  }

  const map = new Map<string, ExcelDimensions>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[colArticle] == null) continue;

    const articleId = String(row[colArticle]).trim();
    if (!articleId) continue;

    const rawWeight = row[colGrossWeight];
    const rawWidth = row[colWidth];
    const rawHeight = row[colHeight];
    const rawLength = row[colLength];

    // Per-row units (fall back to kg / mm if column absent)
    const weightUnit =
      colUnitWeight !== -1 && row[colUnitWeight] != null
        ? String(row[colUnitWeight]).trim().toLowerCase()
        : "kg";
    const packingUnit =
      colUnitPacking !== -1 && row[colUnitPacking] != null
        ? String(row[colUnitPacking]).trim().toLowerCase()
        : "mm";

    const parseNum = (v: any): number | null => {
      if (v == null || v === "") return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    };

    const rawWeightVal = parseNum(rawWeight);
    // Normalize weight → grams
    let grossWeightGrams: number | null = null;
    if (rawWeightVal != null) {
      grossWeightGrams =
        weightUnit === "g"
          ? Math.round(rawWeightVal)
          : Math.round(rawWeightVal * 1000); // kg → g
    }

    // Normalize dimensions → mm
    const normalizeDim = (v: any): number | null => {
      const n = parseNum(v);
      if (n == null) return null;
      return packingUnit === "cm" ? n * 10 : n; // cm → mm
    };

    map.set(articleId, {
      grossWeight: grossWeightGrams,
      widthPacking: normalizeDim(rawWidth),
      heightPacking: normalizeDim(rawHeight),
      lengthPacking: normalizeDim(rawLength),
    });
  }

  return map;
}

async function main() {
  const excelPath = path.resolve(__dirname, "../src/data/siemens_data.xlsx");

  console.log(`Reading Excel file: ${excelPath}`);
  const excelData = readExcelDimensions(excelPath);
  console.log(`Loaded ${excelData.size} rows from Excel`);

  // Fetch all items from DB
  const allItems = await db
    .select({ id: item.id, articleId: item.articleId })
    .from(item)
    .where(eq(item.brandSlug, "siemens"));
  console.log(`Found ${allItems.length} items in DB`);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const dbItem of allItems) {
    const dims = excelData.get(dbItem.articleId);

    if (!dims) {
      notFound++;
      continue;
    }

    // Skip if all dimensions are null
    if (
      dims.grossWeight == null &&
      dims.widthPacking == null &&
      dims.heightPacking == null &&
      dims.lengthPacking == null
    ) {
      skipped++;
      continue;
    }

    await db
      .update(item)
      .set({
        grossWeight: dims.grossWeight,
        widthPacking: dims.widthPacking,
        heightPacking: dims.heightPacking,
        lengthPacking: dims.lengthPacking,
      })
      .where(eq(item.id, dbItem.id));

    updated++;

    if (updated % 100 === 0) {
      console.log(`Updated ${updated} items so far...`);
    }
  }

  console.log("\n=== Done ===");
  console.log(`Updated:   ${updated}`);
  console.log(`Not found in Excel: ${notFound}`);
  console.log(`Skipped (all nulls): ${skipped}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
