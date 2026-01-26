import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedItemData {
  articleId: string;
  alias?: string;
  itemName: string;
  slug: string;
  brandName: string;
  categoryName: string;
  subcategoryName: string | null;
  price: number;
  isDisplayed: boolean;
  quantity: number;
  itemImageLink: string[];
  seller: string | null;
  description: string;
  specifications: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  locale: string;
}

export interface ExcelToJsonResult {
  items: ParsedItemData[];
  brands: Set<string>;
  categories: Set<string>;
  subcategories: Map<string, string>; // subcategory -> parent category
}

/**
 * Converts Excel file to JSON according to the mapping specified in SEED_INSTRUCTIONS.md
 * @param filePath - Absolute path to the Excel file
 * @param locale - Locale for the data (default: 'ua')
 * @returns Parsed data with items, brands, categories, and subcategories
 */
export function parseExcelToJson(
  filePath: string,
  locale: string = 'ua'
): ExcelToJsonResult {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON (header: 1 means array of arrays)
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Skip header row
  const dataRows = rawData.slice(1);
  
  const items: ParsedItemData[] = [];
  const brands = new Set<string>();
  const categories = new Set<string>();
  const subcategories = new Map<string, string>();
  
  for (const row of dataRows) {
    // Skip empty rows
    if (!row || row.length === 0 || !row[0]) {
      continue;
    }
    
    // Column mapping as per SEED_INSTRUCTIONS.md (0-indexed):
    // A(0): articleId, D(3): itemName, F(5): slug, G(6): brand
    // H(7): category, I(8): subcategory, J(9): price
    // M(12): isDisplayed, N(13): quantity, O(14): images
    // P(15): seller, Q(16): description, R(17): specifications
    // U(20): metaKeywords, V(21): metaDescription
    
    const articleId = String(row[0] || '').trim();
    const itemName = String(row[3] || '').trim();
    const slug = String(row[5] || '').trim();
    const alias = "";
    const brandName = String(row[6] || '').trim();
    const categoryName = String(row[7] || '').trim();
    const subcategoryName = row[8] ? String(row[8]).trim() : null;
    const price = parseFloat(String(row[9] || '0'));
    const isDisplayed = String(row[12] || 'нет').toLowerCase() === 'да' || String(row[12] || 'false').toLowerCase() === 'true';
    const quantity = parseInt(String(row[13] || '0'), 10);
    const imageLinks = row[14] 
      ? String(row[14]).split(',').map(link => link.trim()).filter(link => link.length > 0)
      : [];
    const seller = row[15] ? String(row[15]).trim() : null;
    const description = String(row[16] || '').trim();
    const specifications = row[17] ? String(row[17]).trim() : null;
    const metaKeywords = row[20] ? String(row[20]).trim() : null;
    const metaDescription = row[21] ? String(row[21]).trim() : null;
    
    // Skip if essential fields are missing
    if (!articleId || !itemName || !slug || !categoryName) {
      console.warn(`Skipping row with missing essential data: ${articleId}`);
      continue;
    }
    
    // Add to collections
    if (brandName) brands.add(brandName);
    if (categoryName) categories.add(categoryName);
    if (subcategoryName && categoryName) {
      subcategories.set(subcategoryName, categoryName);
    }
    
    items.push({
      articleId,
      alias,
      itemName,
      slug,
      brandName,
      categoryName,
      subcategoryName,
      price,
      isDisplayed,
      quantity,
      itemImageLink: imageLinks,
      seller,
      description,
      specifications,
      metaKeywords,
      metaDescription,
      locale
    });
  }
  
  return {
    items,
    brands,
    categories,
    subcategories
  };
}

/**
 * Saves parsed data to JSON file for inspection
 */
export function saveToJsonFile(data: ExcelToJsonResult, outputPath: string): void {
  const output = {
    items: data.items,
    brands: Array.from(data.brands),
    categories: Array.from(data.categories),
    subcategories: Array.from(data.subcategories.entries()).map(([sub, parent]) => ({
      subcategory: sub,
      parentCategory: parent
    }))
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✓ Saved parsed data to ${outputPath}`);
}
