import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

type FileType = 'ARA' | 'Omron' | 'Pilz' | 'Schneider' | 'Encon';

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

async function processARAFile(workbook: XLSX.WorkBook, warehouseId: string) {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  const defaultCategorySlug = 'low-voltage-components'; // Default category

  const sheetsToProcess = ['Siemens', 'Phoenix', 'MURRELEKTRONIC', 'SICK', 'HARTING'];
  
  for (const sheetName of sheetsToProcess) {
    if (!workbook.SheetNames.includes(sheetName)) {
      results.errors.push(`Sheet '${sheetName}' not found in workbook`);
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

    const brandSlug = sheetName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any;
      
      try {
        const articleId = getCellValue(row, 'A');
        if (!articleId) continue;

        const isHarting = sheetName === 'HARTING';
        
        const quantity = isHarting ? getCellValue(row, 'C') : getCellValue(row, 'B');
        const price = isHarting ? getCellValue(row, 'E') : getCellValue(row, 'D');
        const itemNameES = isHarting ? getCellValue(row, 'B') : getCellValue(row, 'A');
        const itemNameDefault = getCellValue(row, 'A');

        if (!price) continue;

        const slug = createSlug(brandSlug, articleId);

        // Check if item exists
        const [existingItem] = await db
          .select()
          .from(schema.item)
          .where(eq(schema.item.slug, slug))
          .limit(1);

        let itemId: string;

        if (existingItem) {
          itemId = existingItem.id;
          await db
            .update(schema.item)
            .set({
              brandSlug,
              categorySlug: defaultCategorySlug,
              updatedAt: now,
            })
            .where(eq(schema.item.id, itemId));

          results.updated++;
        } else {
          [{ id: itemId }] = await db
            .insert(schema.item)
            .values({
              articleId,
              slug,
              isDisplayed: false,
              brandSlug,
              categorySlug: defaultCategorySlug,
              updatedAt: now,
            })
            .returning({ id: schema.item.id });

          results.created++;
        }

        // Handle item details for different locales
        const locales = isHarting ? ['es', 'pl', 'en', 'ua'] : ['pl', 'en', 'ua', 'es'];
        
        for (const locale of locales) {
          const itemName = (isHarting && locale === 'es') ? itemNameES : itemNameDefault;
          
          const [existingDetail] = await db
            .select()
            .from(schema.itemDetails)
            .where(
              and(
                eq(schema.itemDetails.itemSlug, slug),
                eq(schema.itemDetails.locale, locale)
              )
            )
            .limit(1);

          if (existingDetail) {
            await db
              .update(schema.itemDetails)
              .set({ itemName })
              .where(eq(schema.itemDetails.id, existingDetail.id));
          } else {
            await db
              .insert(schema.itemDetails)
              .values({
                id: randomUUID(),
                itemSlug: slug,
                locale,
                itemName,
                description: '',
              });
          }
        }

        // Handle item price
        const [existingPrice] = await db
          .select()
          .from(schema.itemPrice)
          .where(
            and(
              eq(schema.itemPrice.itemSlug, slug),
              eq(schema.itemPrice.warehouseId, warehouseId)
            )
          )
          .limit(1);

        if (existingPrice) {
          await db
            .update(schema.itemPrice)
            .set({
              price: Number(price),
              quantity: Number(quantity) || 0,
              updatedAt: now,
            })
            .where(eq(schema.itemPrice.id, existingPrice.id));
        } else {
          await db
            .insert(schema.itemPrice)
            .values({
              id: randomUUID(),
              itemSlug: slug,
              warehouseId,
              price: Number(price),
              quantity: Number(quantity) || 0,
              badge: 'ABSENT',
              createdAt: now,
              updatedAt: now,
            });
        }
      } catch (error) {
        results.errors.push(
          `Sheet ${sheetName}, Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  return results;
}

async function processOmronFile(workbook: XLSX.WorkBook, warehouseId: string) {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  const defaultCategorySlug = 'low-voltage-components';
  const brandSlug = 'omron';

  const sheetName = 'Hoja1';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as any;
    
    try {
      const articleId = getCellValue(row, 'A');
      const alias = getCellValue(row, 'E');
      const itemName = getCellValue(row, 'B');
      const specifications = getCellValue(row, 'E');
      const price = getCellValue(row, 'J');

      if (!articleId || !price) continue;

      const slug = createSlug(brandSlug, articleId);

      const [existingItem] = await db
        .select()
        .from(schema.item)
        .where(eq(schema.item.slug, slug))
        .limit(1);

      let itemId: string;

      if (existingItem) {
        itemId = existingItem.id;
        await db
          .update(schema.item)
          .set({
            alias: alias || null,
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .where(eq(schema.item.id, itemId));

        results.updated++;
      } else {
        [{ id: itemId }] = await db
          .insert(schema.item)
          .values({
            articleId,
            slug,
            alias: alias || null,
            isDisplayed: false,
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .returning({ id: schema.item.id });

        results.created++;
      }

      // Handle item details for all locales
      const locales = ['pl', 'en', 'ua', 'es'];
      
      for (const locale of locales) {
        const [existingDetail] = await db
          .select()
          .from(schema.itemDetails)
          .where(
            and(
              eq(schema.itemDetails.itemSlug, slug),
              eq(schema.itemDetails.locale, locale)
            )
          )
          .limit(1);

        if (existingDetail) {
          await db
            .update(schema.itemDetails)
            .set({
              itemName,
              specifications: specifications || null,
            })
            .where(eq(schema.itemDetails.id, existingDetail.id));
        } else {
          await db
            .insert(schema.itemDetails)
            .values({
              id: randomUUID(),
              itemSlug: slug,
              locale,
              itemName,
              description: '',
              specifications: specifications || null,
            });
        }
      }

      // Handle item price
      const [existingPrice] = await db
        .select()
        .from(schema.itemPrice)
        .where(
          and(
            eq(schema.itemPrice.itemSlug, slug),
            eq(schema.itemPrice.warehouseId, warehouseId)
          )
        )
        .limit(1);

      if (existingPrice) {
        await db
          .update(schema.itemPrice)
          .set({
            price: Number(price),
            quantity: 0,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, existingPrice.id));
      } else {
        await db
          .insert(schema.itemPrice)
          .values({
            id: randomUUID(),
            itemSlug: slug,
            warehouseId,
            price: Number(price),
            quantity: 0,
            badge: 'ABSENT',
            createdAt: now,
            updatedAt: now,
          });
      }
    } catch (error) {
      results.errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return results;
}

async function processPilzFile(workbook: XLSX.WorkBook, warehouseId: string) {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  const defaultCategorySlug = 'low-voltage-components';
  const brandSlug = 'pilz';

  const sheetName = 'Price List SE';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as any;
    
    try {
      const articleId = getCellValue(row, 'A');
      const itemName = getCellValue(row, 'B');
      const price = getCellValue(row, 'C');

      if (!articleId || !price) continue;

      const slug = createSlug(brandSlug, articleId);

      const [existingItem] = await db
        .select()
        .from(schema.item)
        .where(eq(schema.item.slug, slug))
        .limit(1);

      let itemId: string;

      if (existingItem) {
        itemId = existingItem.id;
        await db
          .update(schema.item)
          .set({
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .where(eq(schema.item.id, itemId));

        results.updated++;
      } else {
        [{ id: itemId }] = await db
          .insert(schema.item)
          .values({
            articleId,
            slug,
            isDisplayed: false,
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .returning({ id: schema.item.id });

        results.created++;
      }

      // Handle item details for all locales
      const locales = ['pl', 'en', 'ua', 'es'];
      
      for (const locale of locales) {
        const [existingDetail] = await db
          .select()
          .from(schema.itemDetails)
          .where(
            and(
              eq(schema.itemDetails.itemSlug, slug),
              eq(schema.itemDetails.locale, locale)
            )
          )
          .limit(1);

        if (existingDetail) {
          await db
            .update(schema.itemDetails)
            .set({ itemName })
            .where(eq(schema.itemDetails.id, existingDetail.id));
        } else {
          await db
            .insert(schema.itemDetails)
            .values({
              id: randomUUID(),
              itemSlug: slug,
              locale,
              itemName,
              description: '',
            });
        }
      }

      // Handle item price
      const [existingPrice] = await db
        .select()
        .from(schema.itemPrice)
        .where(
          and(
            eq(schema.itemPrice.itemSlug, slug),
            eq(schema.itemPrice.warehouseId, warehouseId)
          )
        )
        .limit(1);

      if (existingPrice) {
        await db
          .update(schema.itemPrice)
          .set({
            price: Number(price),
            quantity: 0,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, existingPrice.id));
      } else {
        await db
          .insert(schema.itemPrice)
          .values({
            id: randomUUID(),
            itemSlug: slug,
            warehouseId,
            price: Number(price),
            quantity: 0,
            badge: 'ABSENT',
            createdAt: now,
            updatedAt: now,
          });
      }
    } catch (error) {
      results.errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return results;
}

async function processSchneiderFile(workbook: XLSX.WorkBook, warehouseId: string) {
  const results = { created: 0, updated: 0, errors: [] as string[] };
  const now = new Date().toISOString();
  const defaultCategorySlug = 'low-voltage-components';
  const brandSlug = 'schneider-electric';

  const sheetName = 'Hoja1';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });

  // Start from row 3 (index 2)
  for (let i = 2; i < data.length; i++) {
    const row = data[i] as any;
    
    try {
      const articleId = getCellValue(row, 'A');
      const price = getCellValue(row, 'F');
      const itemName = getCellValue(row, 'A'); // Use articleId as itemName

      if (!articleId || !price) continue;

      const slug = createSlug(brandSlug, articleId);

      const [existingItem] = await db
        .select()
        .from(schema.item)
        .where(eq(schema.item.slug, slug))
        .limit(1);

      let itemId: string;

      if (existingItem) {
        itemId = existingItem.id;
        await db
          .update(schema.item)
          .set({
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .where(eq(schema.item.id, itemId));

        results.updated++;
      } else {
        [{ id: itemId }] = await db
          .insert(schema.item)
          .values({
            articleId,
            slug,
            isDisplayed: false,
            brandSlug,
            categorySlug: defaultCategorySlug,
            updatedAt: now,
          })
          .returning({ id: schema.item.id });

        results.created++;
      }

      // Handle item details for all locales
      const locales = ['pl', 'en', 'ua', 'es'];
      
      for (const locale of locales) {
        const [existingDetail] = await db
          .select()
          .from(schema.itemDetails)
          .where(
            and(
              eq(schema.itemDetails.itemSlug, slug),
              eq(schema.itemDetails.locale, locale)
            )
          )
          .limit(1);

        if (existingDetail) {
          await db
            .update(schema.itemDetails)
            .set({ itemName })
            .where(eq(schema.itemDetails.id, existingDetail.id));
        } else {
          await db
            .insert(schema.itemDetails)
            .values({
              id: randomUUID(),
              itemSlug: slug,
              locale,
              itemName,
              description: '',
            });
        }
      }

      // Handle item price
      const [existingPrice] = await db
        .select()
        .from(schema.itemPrice)
        .where(
          and(
            eq(schema.itemPrice.itemSlug, slug),
            eq(schema.itemPrice.warehouseId, warehouseId)
          )
        )
        .limit(1);

      if (existingPrice) {
        await db
          .update(schema.itemPrice)
          .set({
            price: Number(price),
            quantity: 0,
            updatedAt: now,
          })
          .where(eq(schema.itemPrice.id, existingPrice.id));
      } else {
        await db
          .insert(schema.itemPrice)
          .values({
            id: randomUUID(),
            itemSlug: slug,
            warehouseId,
            price: Number(price),
            quantity: 0,
            badge: 'ABSENT',
            createdAt: now,
            updatedAt: now,
          });
      }
    } catch (error) {
      results.errors.push(
        `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return results;
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
      results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
