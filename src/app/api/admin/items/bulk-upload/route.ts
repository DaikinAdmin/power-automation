import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

  // Batch inserts with optimized chunk sizes
  if (items.length > 0) {
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.item)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.item.slug,
          set: {
            alias: chunk[0].alias,
            brandSlug: chunk[0].brandSlug,
            categorySlug: chunk[0].categorySlug,
            updatedAt: now,
          },
        });
    }
    results.created = items.length;
  }

  if (itemDetails.length > 0) {
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < itemDetails.length; i += CHUNK_SIZE) {
      const chunk = itemDetails.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.itemDetails)
        .values(chunk)
        .onConflictDoUpdate({
          target: [schema.itemDetails.itemSlug, schema.itemDetails.locale],
          set: {
            itemName: chunk[0].itemName,
            specifications: chunk[0].specifications,
          },
        });
    }
  }

  if (itemPrices.length > 0) {
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < itemPrices.length; i += CHUNK_SIZE) {
      const chunk = itemPrices.slice(i, i + CHUNK_SIZE);
      await db.insert(schema.itemPrice)
        .values(chunk)
        .onConflictDoUpdate({
          target: [schema.itemPrice.itemSlug, schema.itemPrice.warehouseId],
          set: {
            price: chunk[0].price,
            quantity: chunk[0].quantity,
            updatedAt: now,
          },
        });
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
