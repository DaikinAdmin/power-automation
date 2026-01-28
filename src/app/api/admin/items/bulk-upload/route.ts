import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

type FileType = 'ARA' | 'Omron' | 'Pilz' | 'Schneider' | 'Encon';

interface FileTypeConfig {
  sheets?: string[]; // For multi-sheet files like ARA
  sheetName?: string; // For single-sheet files
  startRow?: number; // Starting row index (0-based)
  brandSlug?: string; // For single-brand files
  columnMappings: {
    articleId: string;
    price: string;
    quantity?: string;
    itemName?: string;
    alias?: string;
    specifications?: string;
  };
  // Dynamic brand slug from sheet name (for ARA)
  brandFromSheet?: boolean;
  // Special handling for different locales
  localeMapping?: {
    locale: string;
    itemNameColumn: string;
  }[];
}

const FILE_CONFIGS: Record<FileType, FileTypeConfig> = {
  ARA: {
    sheets: ['SIEMENS', 'PHOENIX', 'MURRELEKTRONIK', 'SICK', 'HARTING'],
    startRow: 1,
    brandFromSheet: true,
    columnMappings: {
      articleId: 'A',
      price: 'D', // Default, will be overridden for HARTING
      quantity: 'B',
      itemName: 'A',
    },
  },
  Omron: {
    sheetName: 'Hoja1',
    startRow: 1,
    brandSlug: 'omron',
    columnMappings: {
      articleId: 'A',
      price: 'J',
      itemName: 'B',
      alias: 'E',
      specifications: 'E',
    },
  },
  Pilz: {
    sheetName: 'Price List SE',
    startRow: 1,
    brandSlug: 'pilz',
    columnMappings: {
      articleId: 'A',
      price: 'C',
      itemName: 'B',
    },
  },
  Schneider: {
    sheetName: 'Hoja1',
    startRow: 2, // Starts from row 3
    brandSlug: 'schneider-electric',
    columnMappings: {
      articleId: 'A',
      price: 'F',
      itemName: 'A',
    },
  },
  Encon: {
    sheetName: 'Sheet1',
    startRow: 0,
    brandSlug: 'encon',
    columnMappings: {
      articleId: 'A',
      price: 'B',
      itemName: 'C',
    },
  },
};

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session };
}

function createSlug(brand: string, articleId: string): string {
  const processedArticleId = articleId
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${brand}_${processedArticleId}`;
}

function getCellValue(row: any, col: string): any {
  return row[col] !== undefined && row[col] !== null && row[col] !== '' ? row[col] : null;
}

async function getOrCreateWarehouse(warehouseName: string) {
  const [warehouse] = await db
    .select()
    .from(schema.warehouse)
    .where(eq(schema.warehouse.name, warehouseName))
    .limit(1);

  if (!warehouse) {
    throw new Error(`Warehouse '${warehouseName}' not found`);
  }

  return warehouse;
}

async function processGenericFile(
  workbook: XLSX.WorkBook,
  warehouseId: string,
  fileType: FileType,
  config: FileTypeConfig
) {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  const defaultCategorySlug = 'low-voltage-components';

  const items: any[] = [];
  const itemDetails: any[] = [];
  const itemPrices: any[] = [];

  // Determine sheets to process
  const sheetsToProcess = config.sheets || [config.sheetName!];

  for (const sheetName of sheetsToProcess) {
    if (!workbook.SheetNames.includes(sheetName)) {
      if (config.sheets) {
        results.errors.push(`Sheet '${sheetName}' not found in workbook`);
        continue;
      } else {
        throw new Error(`Sheet '${sheetName}' not found`);
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

    // Determine brand slug
    const brandSlug = config.brandFromSheet
      ? sheetName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
      : config.brandSlug!;

    // Special handling for ARA HARTING
    const isHarting = fileType === 'ARA' && sheetName === 'HARTING';
    const priceColumn = isHarting ? 'E' : config.columnMappings.price;
    const quantityColumn = isHarting ? 'C' : config.columnMappings.quantity || 'B';

    for (let i = config.startRow || 0; i < data.length; i++) {
      const row = data[i] as any;

      try {
        const articleId = getCellValue(row, config.columnMappings.articleId);
        if (!articleId) continue;

        const price = getCellValue(row, priceColumn);
        if (!price) continue;

        const quantity = getCellValue(row, quantityColumn);
        const itemName = getCellValue(row, config.columnMappings.itemName || 'A');
        const alias = config.columnMappings.alias ? getCellValue(row, config.columnMappings.alias) : null;
        const specifications = config.columnMappings.specifications
          ? getCellValue(row, config.columnMappings.specifications)
          : null;

        const slug = createSlug(brandSlug, articleId);

        // Prepare item data
        items.push({
          articleId,
          slug,
          alias: alias || null,
          isDisplayed: false,
          brandSlug,
          categorySlug: defaultCategorySlug,
          updatedAt: now,
        });

        // Prepare item details for all locales
        const locales = isHarting ? ['es', 'pl', 'en', 'ua'] : ['pl', 'en', 'ua', 'es'];
        for (const locale of locales) {
          // Special handling for HARTING Spanish locale
          const localizedItemName = isHarting && locale === 'es'
            ? getCellValue(row, 'B')
            : itemName;

          itemDetails.push({
            id: randomUUID(),
            itemSlug: slug,
            locale,
            itemName: localizedItemName,
            description: '',
            specifications: specifications || null,
          });
        }

        // Prepare item price
        itemPrices.push({
          id: randomUUID(),
          itemSlug: slug,
          warehouseId,
          price: Number(price),
          quantity: Number(quantity) || 0,
          badge: 'ABSENT',
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
        const errorPrefix = config.sheets ? `Sheet ${sheetName}, ` : '';
        results.errors.push(
          `${errorPrefix}Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  // Deduplicate by slug - keep last occurrence (most recent data)
  const uniqueItems = Array.from(
    new Map(items.map(item => [item.slug, item])).values()
  );

  // Deduplicate item details by slug + locale
  const uniqueDetails = Array.from(
    new Map(itemDetails.map(detail => [`${detail.itemSlug}_${detail.locale}`, detail])).values()
  );

  // Deduplicate item prices by slug + warehouse
  const uniquePrices = Array.from(
    new Map(itemPrices.map(price => [`${price.itemSlug}_${price.warehouseId}`, price])).values()
  );

  // Log deduplication stats
  if (items.length !== uniqueItems.length) {
    results.errors.push(`Deduplicated ${items.length - uniqueItems.length} duplicate items`);
  }

  // Check which items already exist in the database
  const itemSlugs = uniqueItems.map(item => item.slug);
  const existingItems = await db
    .select({ slug: schema.item.slug, id: schema.item.id })
    .from(schema.item)
    .where(inArray(schema.item.slug, itemSlugs));
  
  const existingItemSlugs = new Set(existingItems.map(item => item.slug));
  const existingItemMap = new Map(existingItems.map(item => [item.slug, item]));
  
  // Separate new and existing items
  const newItems = uniqueItems.filter(item => !existingItemSlugs.has(item.slug));
  const existingItemsToUpdate = uniqueItems.filter(item => existingItemSlugs.has(item.slug));
  
  // Get item details and prices for new items only
  const newItemSlugs = new Set(newItems.map(item => item.slug));
  const newItemDetails = uniqueDetails.filter(detail => newItemSlugs.has(detail.itemSlug));
  const newItemPrices = uniquePrices.filter(price => newItemSlugs.has(price.itemSlug));
  
  // Get prices for existing items (we'll only update prices for these)
  const existingItemPrices = uniquePrices.filter(price => existingItemSlugs.has(price.itemSlug));

  // Batch inserts with optimized chunk sizes
  // PostgreSQL limit: ROW expressions can have at most 1664 entries (total parameters)
  // Formula: max_rows = 1664 / number_of_columns
  
  // Insert NEW items only
  if (newItems.length > 0) {
    const CHUNK_SIZE = 200; // 7-8 columns = 1400-1600 parameters (safe)
    for (let i = 0; i < newItems.length; i += CHUNK_SIZE) {
      const chunk = newItems.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.item).values(chunk);
    }
    results.created = newItems.length;
  }

  // Insert item details for NEW items only
  if (newItemDetails.length > 0) {
    const CHUNK_SIZE = 100; // 11 columns = 1100 parameters (safe)
    for (let i = 0; i < newItemDetails.length; i += CHUNK_SIZE) {
      const chunk = newItemDetails.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.itemDetails).values(chunk);
    }
  }

  // Insert item prices for NEW items only
  if (newItemPrices.length > 0) {
    const CHUNK_SIZE = 100; // 11 columns = 1100 parameters (safe)
    for (let i = 0; i < newItemPrices.length; i += CHUNK_SIZE) {
      const chunk = newItemPrices.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.itemPrice).values(chunk);
    }
  }

  // Handle EXISTING items - only update prices
  if (existingItemPrices.length > 0) {
    // Fetch current prices for these items
    const existingPriceSlugs = [...new Set(existingItemPrices.map(p => p.itemSlug))];
    const currentPrices = await db
      .select()
      .from(schema.itemPrice)
      .where(
        and(
          inArray(schema.itemPrice.itemSlug, existingPriceSlugs),
          eq(schema.itemPrice.warehouseId, warehouseId)
        )
      );
    
    const currentPriceMap = new Map(
      currentPrices.map(p => [`${p.itemSlug}_${p.warehouseId}`, p])
    );

    // Move current prices to history and update with new prices
    for (const newPrice of existingItemPrices) {
      const key = `${newPrice.itemSlug}_${newPrice.warehouseId}`;
      const currentPrice = currentPriceMap.get(key);
      
      if (currentPrice) {
        // Get item ID for history record
        const itemData = existingItemMap.get(newPrice.itemSlug);
        
        if (itemData) {
          // Insert current price into history
          await db.insert(schema.itemPriceHistory).values({
            itemId: itemData.id,
            warehouseId: currentPrice.warehouseId,
            price: currentPrice.price,
            quantity: currentPrice.quantity,
            promotionPrice: currentPrice.promotionPrice,
            promoCode: currentPrice.promoCode,
            promoEndDate: currentPrice.promoEndDate,
            badge: currentPrice.badge,
            recordedAt: currentPrice.updatedAt || currentPrice.createdAt,
          });
        }
        
        // Update with new price
        await db
          .update(schema.itemPrice)
          .set({
            price: newPrice.price,
            quantity: newPrice.quantity,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, currentPrice.id));
        
        results.updated++;
      } else {
        // Price doesn't exist yet for this warehouse, insert it
        await db.insert(schema.itemPrice).values(newPrice);
        results.created++;
      }
    }
  }

  return results;
}

async function processARAFile(workbook: XLSX.WorkBook, warehouseId: string) {
  return processGenericFile(workbook, warehouseId, 'ARA', FILE_CONFIGS.ARA);
}

async function processOmronFile(workbook: XLSX.WorkBook, warehouseId: string) {
  return processGenericFile(workbook, warehouseId, 'Omron', FILE_CONFIGS.Omron);
}

async function processPilzFile(workbook: XLSX.WorkBook, warehouseId: string) {
  return processGenericFile(workbook, warehouseId, 'Pilz', FILE_CONFIGS.Pilz);
}

async function processSchneiderFile(workbook: XLSX.WorkBook, warehouseId: string) {
  return processGenericFile(workbook, warehouseId, 'Schneider', FILE_CONFIGS.Schneider);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = (formData.get('fileType') as FileType) || 'Encon';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let results;

    // Determine warehouse based on file type
    let warehouseName: string;
    if (fileType === 'ARA') {
      warehouseName = 'warehouse-3';
    } else if (['Omron', 'Pilz', 'Schneider'].includes(fileType)) {
      warehouseName = 'warehouse-4';
    } else {
      warehouseName = 'warehouse-1'; // Default for Encon
    }

    const warehouse = await getOrCreateWarehouse(warehouseName);

    // Process file based on type
    switch (fileType) {
      case 'ARA':
        results = await processARAFile(workbook, warehouse.id);
        break;
      case 'Omron':
        results = await processOmronFile(workbook, warehouse.id);
        break;
      case 'Pilz':
        results = await processPilzFile(workbook, warehouse.id);
        break;
      case 'Schneider':
        results = await processSchneiderFile(workbook, warehouse.id);
        break;
      case 'Encon':
        return NextResponse.json(
          { error: 'Encon format not yet implemented' },
          { status: 501 }
        );
      default:
        return NextResponse.json(
          { error: 'Invalid file type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Bulk upload completed. Created: ${results.created}, Updated: ${results.updated}`,
      details: results.errors.length > 0 ? results.errors : undefined,
      results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? [error.message] : ['Unknown error']
      },
      { status: 500 }
    );
  }
}
