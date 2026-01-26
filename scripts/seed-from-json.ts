import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
import pg from 'pg';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import { readFile } from 'fs/promises';
import * as crypto from 'crypto';
import {
  brand,
  category,
  subcategories,
  item,
  itemDetails,
  itemPrice,
  warehouse,
  categoryTranslation,
  subcategoryTranslation,
} from '../src/db/schema';
import { ParsedItemData } from './excel-parser';

// Create database connection directly with pg Pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

const translations: Record<string, string> = {
  'Кліматична техніка': 'Climate Equipment',
  'Контрольно-вимірювальні прилади': 'Measuring Instruments',
  'Генератори': 'Generators',
  'Двигуни і приводи': 'Motors and Drives',
  'Перетворювачі для двигунів': 'Motor Converters',
  'Компоненти систем керування': 'Control System Components',
  'Комутаційне обладнання': 'Switching Equipment',
  'Комунікаційне обладнання': 'Communication Equipment',
  'Командно-сигнальна арматура': 'Control and Signal Devices',
  'Компоненти систем безпеки': 'Safety System Components',
  'Монтажне обладнання': 'Installation Equipment',
  'Конструктиви': 'Structures',
  'Плавкі запобіжники': 'Fuses',
  'Siemens Simatic S5': 'Siemens Simatic S5',
  'Апаратура захисту': 'Protection Equipment',
  'Блоки живлення': 'Power Supplies',
  'Низьковольтні компоненти': 'Low Voltage Components',
  'Датчики тиску': 'Pressure Sensors',
  'Датчики температури': 'Temperature Sensors',
  'Витратоміри': 'Flow Meters',
  'Бензинові': 'Gasoline',
  'Серво': 'Servo',
  'Частотні перетворювачі': 'Frequency Converters',
  'Панелі операторів': 'Operator Panels',
  'Станції вводу-виводу': 'Input-Output Stations',
  'Конвертори сигналів': 'Signal Converters',
  'Контролери': 'Controllers',
  'Контактори': 'Contactors',
  'Комутатори': 'Network Switches',
  'Компоненти захисту': 'Protection Components',
  'Пристрої плавного пуску': 'Soft Starters',
  'Реле': 'Relays',
  'Пасивні мережеві компоненти': 'Passive Network Components',
  'Кнопки': 'Buttons',
  'Перемикачі': 'Selector Switches',
  'Елементи індикації': 'Indication Elements',
  'Реле безпеки': 'Safety Relays',
  'Кінцевики': 'Limit Switches',
  'Клемні системи': 'Terminal Systems',
  'Кабель': 'Cable',
  'Шафи для електрообладнання': 'Electrical Cabinets'
};

function translateToEnglish(text: string, locale: string): string {
  if (locale === 'ua') {
    return translations[text] || text;
  }
  return text;
}

function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(): string {
  return crypto.randomUUID();
}

type JsonSubcategoryRow = {
  subcategory: string;
  parentCategory: string;
};

type JsonSeedData = {
  items: ParsedItemData[];
  brands: string[];
  categories: string[];
  subcategories: JsonSubcategoryRow[];
};

async function getOrCreateBrand(brandName: string): Promise<string> {
  if (!brandName) {
    throw new Error('Brand name is required');
  }

  const alias = createSlug(brandName);
  const existingBrands = await db
    .select()
    .from(brand)
    .where(eq(brand.alias, alias));

  if (existingBrands.length > 0) {
    return alias;
  }

  await db
    .insert(brand)
    .values({
      id: generateId(),
      name: brandName,
      alias,
      imageLink: '/imgs/brands/default.png',
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  return alias;
}

async function getOrCreateCategory(categoryName: string, locale: string): Promise<{ id: string; slug: string }> {
  const englishName = translateToEnglish(categoryName, locale);
  const slug = createSlug(englishName);

  const existingCategories = await db
    .select()
    .from(category)
    .where(eq(category.slug, slug));

  if (existingCategories.length > 0) {
    return { id: existingCategories[0].id, slug: existingCategories[0].slug };
  }

  const categoryId = generateId();
  await db
    .insert(category)
    .values({
      id: categoryId,
      name: englishName,
      slug,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  return { id: categoryId, slug };
}

async function createOrUpdateSubcategoryTranslation(
  subcategorySlug: string,
  locale: string,
  localizedName: string
): Promise<void> {
  // Check if translation already exists
  const existingTranslation = await db
    .select()
    .from(subcategoryTranslation)
    .where(
      and(
        eq(subcategoryTranslation.subCategorySlug, subcategorySlug),
        eq(subcategoryTranslation.locale, locale)
      )
    );

  if (existingTranslation.length > 0) {
    // Update existing translation
    await db
      .update(subcategoryTranslation)
      .set({ name: localizedName })
      .where(eq(subcategoryTranslation.id, existingTranslation[0].id));
  } else {
    // Create new translation
    await db
      .insert(subcategoryTranslation)
      .values({
        id: generateId(),
        subCategorySlug: subcategorySlug,
        locale,
        name: localizedName
      });
  }
}

async function getOrCreateSubcategory(
  subcategoryName: string,
  parentCategorySlug: string,
  locale: string
): Promise<{ id: string; slug: string }> {
  const subcategoryOnly = subcategoryName.includes('/')
    ? subcategoryName.split('/')[1].trim()
    : subcategoryName;

  const englishName = translateToEnglish(subcategoryOnly, locale);
  const slug = createSlug(englishName);

  // Check if subcategory exists by slug only (since slug has unique constraint)
  const existingSubcategories = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.slug, slug));

  if (existingSubcategories.length > 0) {
    const existing = existingSubcategories[0];
    
    // Update the subcategory data
    await db
      .update(subcategories)
      .set({
        name: englishName,
        categorySlug: parentCategorySlug,
        updatedAt: new Date().toISOString()
      })
      .where(eq(subcategories.id, existing.id));

    // Create or update translation
    await createOrUpdateSubcategoryTranslation(existing.slug, locale, subcategoryOnly);

    return { id: existing.id, slug: existing.slug };
  }

  // Create new subcategory
  const subcategoryId = generateId();
  await db
    .insert(subcategories)
    .values({
      id: subcategoryId,
      name: englishName,
      slug,
      categorySlug: parentCategorySlug,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  // Create translation for the new subcategory
  await createOrUpdateSubcategoryTranslation(slug, locale, subcategoryOnly);

  return { id: subcategoryId, slug };
}

async function createOrUpdateItem(
  itemData: ParsedItemData,
  brandAlias: string | null,
  categorySlug: string,
  warehouseId: string
): Promise<void> {
  const existingItems = await db
    .select()
    .from(item)
    .where(eq(item.slug, itemData.slug));

  let currentItemId: string;
  if (existingItems.length > 0) {
    currentItemId = existingItems[0].id;
    await db
      .update(item)
      .set({
        slug: itemData.slug,
        alias: itemData.alias || null,
        isDisplayed: itemData.isDisplayed,
        brandSlug: brandAlias,
        categorySlug,
        itemImageLink: itemData.itemImageLink,
        updatedAt: new Date().toISOString()
      })
      .where(eq(item.id, currentItemId));
  } else {
    currentItemId = generateId();
    await db
      .insert(item)
      .values({
        id: currentItemId,
        articleId: itemData.articleId,
        slug: itemData.slug,
        alias: itemData.alias || null,
        isDisplayed: itemData.isDisplayed,
        brandSlug: brandAlias,
        categorySlug,
        itemImageLink: itemData.itemImageLink,
        sellCounter: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
  }

  const existingDetails = await db
    .select()
    .from(itemDetails)
    .where(
      and(
        eq(itemDetails.itemSlug, itemData.slug),
        eq(itemDetails.locale, itemData.locale)
      )
    );

  if (existingDetails.length > 0) {
    await db
      .update(itemDetails)
      .set({
        itemName: itemData.itemName,
        description: itemData.description,
        specifications: itemData.specifications,
        seller: itemData.seller,
        metaDescription: itemData.metaDescription,
        metaKeyWords: itemData.metaKeywords
      })
      .where(eq(itemDetails.id, existingDetails[0].id));
  } else {
    await db
      .insert(itemDetails)
      .values({
        id: generateId(),
        locale: itemData.locale,
        itemName: itemData.itemName,
        description: itemData.description,
        specifications: itemData.specifications,
        seller: itemData.seller,
        metaDescription: itemData.metaDescription,
        metaKeyWords: itemData.metaKeywords,
        itemSlug: itemData.slug
      });
  }

  const existingPrices = await db
    .select()
    .from(itemPrice)
    .where(
      and(
        eq(itemPrice.itemSlug, itemData.slug),
        eq(itemPrice.warehouseId, warehouseId)
      )
    );

  if (existingPrices.length > 0) {
    await db
      .update(itemPrice)
      .set({
        price: itemData.price,
        quantity: itemData.quantity || 0,
        updatedAt: new Date().toISOString()
      })
      .where(eq(itemPrice.id, existingPrices[0].id));
  } else {
    await db
      .insert(itemPrice)
      .values({
        id: generateId(),
        itemSlug: itemData.slug,
        warehouseId,
        price: itemData.price,
        quantity: itemData.quantity || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
  }
}

async function ensureCategoryTranslation(slug: string, locale: string, name: string): Promise<void> {
  if (!locale || !name || locale === 'ua') {
    return;
  }

  const existing = await db
    .select()
    .from(categoryTranslation)
    .where(
      and(
        eq(categoryTranslation.categorySlug, slug),
        eq(categoryTranslation.locale, locale)
      )
    );

  if (existing.length > 0) {
    return;
  }

  await db
    .insert(categoryTranslation)
    .values({
      id: generateId(),
      categorySlug: slug,
      locale,
      name
    });
}

function getLocalizedCategoryOrder(items: ParsedItemData[]): string[] {
  const seen = new Map<string, true>();
  for (const item of items) {
    const normalized = item.categoryName?.trim();
    if (normalized && !seen.has(normalized)) {
      seen.set(normalized, true);
    }
  }
  return [...seen.keys()];
}

export async function seedFromJson(
  filePath: string,
  warehouseId: string,
  locale: string = 'pl'
): Promise<void> {
  console.log('\n🌱 Starting database seeding from JSON...\n');
  console.log(`📄 Source file: ${filePath}`);
  console.log(`🏢 Warehouse ID: ${warehouseId}`);
  console.log(`🌍 Locale: ${locale}\n`);

  const resolvedPath = path.resolve(process.cwd(), filePath);
  const fileContents = await readFile(resolvedPath, 'utf-8');
  const parsedData: JsonSeedData = JSON.parse(fileContents);

  if (!Array.isArray(parsedData.items)) {
    throw new Error('JSON file does not expose an items array.');
  }

  if (!Array.isArray(parsedData.categories) || parsedData.categories.length === 0) {
    throw new Error('JSON file does not expose a categories array.');
  }

  if (!Array.isArray(parsedData.brands) || parsedData.brands.length === 0) {
    throw new Error('JSON file does not expose a brands array.');
  }

  console.log(`  ✓ Found ${parsedData.items.length} items`);
  console.log(`  ✓ Found ${parsedData.brands.length} unique brands`);
  console.log(`  ✓ Found ${parsedData.categories.length} unique categories`);
  console.log(`  ✓ Found ${parsedData.subcategories.length} unique subcategories\n`);

  const warehouses = await db
    .select()
    .from(warehouse)
    .where(eq(warehouse.id, warehouseId));

  if (warehouses.length === 0) {
    throw new Error(`Warehouse with ID "${warehouseId}" not found`);
  }

  // Brands
  console.log('🏷️  Processing brands...');
  const brandMap = new Map<string, string>();
  for (const brandName of new Set(parsedData.brands)) {
    const alias = await getOrCreateBrand(brandName);
    brandMap.set(brandName, alias);
  }
  console.log('');

  // Categories
  const localizedCategories = getLocalizedCategoryOrder(parsedData.items);
  const canonicalCategories = parsedData.categories;
  const categorySlugByCanonical = new Map<string, string>();
  const categorySlugByLocalized = new Map<string, string>();
  console.log('📁 Processing categories...');

  const zippedLength = Math.min(canonicalCategories.length, localizedCategories.length);
  if (zippedLength < localizedCategories.length || zippedLength < canonicalCategories.length) {
    console.warn('  ⚠️ Mismatch between canonical and localized categories; falling back to canonical order');
  }

  for (let index = 0; index < canonicalCategories.length; index++) {
    const canonicalName = canonicalCategories[index]?.trim();
    if (!canonicalName) {
      continue;
    }
    const localizedNameRaw = index < localizedCategories.length ? localizedCategories[index] : canonicalName;
    const localizedName = localizedNameRaw?.trim() || canonicalName;

    const existingCategory = await getOrCreateCategory(canonicalName, 'ua');
    categorySlugByCanonical.set(canonicalName, existingCategory.slug);
    categorySlugByLocalized.set(localizedName, existingCategory.slug);

    if (locale !== 'ua' && localizedName && localizedName !== canonicalName) {
      await ensureCategoryTranslation(existingCategory.slug, locale, localizedName);
    }
  }
  console.log('');

  // Subcategories
  console.log('📂 Processing subcategories...');
  const subcategorySlugByName = new Map<string, string>();
  for (const row of parsedData.subcategories) {
    const canonicalParent = row.parentCategory?.trim();
    const canonicalSubFull = row.subcategory?.trim();
    if (!canonicalParent || !canonicalSubFull) {
      continue;
    }

    // Extract just the subcategory part (after the '/')
    const canonicalSub = canonicalSubFull.includes('/') 
      ? canonicalSubFull.split('/')[1].trim() 
      : canonicalSubFull;

    const parentSlug = categorySlugByCanonical.get(canonicalParent);
    if (!parentSlug) {
      console.warn(`  ⚠️ Skipping subcategory ${canonicalSub}: parent category not found (${canonicalParent})`);
      continue;
    }

    const sub = await getOrCreateSubcategory(canonicalSub, parentSlug, 'ua');
    // Store both the full path and just the subcategory name for lookup
    subcategorySlugByName.set(canonicalSubFull, sub.slug);
    subcategorySlugByName.set(canonicalSub, sub.slug);
  }
  console.log('');

  // Items
  console.log('📦 Processing items...');
  let processedCount = 0;
  for (const itemData of parsedData.items) {
    try {
      const brandAlias = itemData.brandName ? brandMap.get(itemData.brandName) || null : null;
      const trimmedCategory = itemData.categoryName?.trim() ?? '';
      let categorySlug = categorySlugByLocalized.get(trimmedCategory) ?? categorySlugByCanonical.get(trimmedCategory);

      if (!categorySlug) {
        console.warn(`  ⚠️ Unable to resolve category for ${itemData.slug} (${itemData.categoryName})`);
        continue;
      }

      if (itemData.subcategoryName) {
        const normalizedSubcategory = itemData.subcategoryName.trim();
        let subSlug = subcategorySlugByName.get(normalizedSubcategory);
        
        // If not found in map, try to create it on-the-fly
        if (!subSlug) {
          // Extract subcategory part (after '/')
          const subcategoryOnly = normalizedSubcategory.includes('/')
            ? normalizedSubcategory.split('/')[1].trim()
            : normalizedSubcategory;
          
          // Try to create/get the subcategory using the current category as parent
          try {
            const sub = await getOrCreateSubcategory(subcategoryOnly, categorySlug, locale);
            subSlug = sub.slug;
            // Cache it for future items
            subcategorySlugByName.set(normalizedSubcategory, subSlug);
          } catch (error) {
            console.warn(`  ⚠️ Could not create subcategory ${normalizedSubcategory}:`, error);
          }
        }
        
        if (subSlug) {
          categorySlug = subSlug;
        }
      }

      await createOrUpdateItem(itemData, brandAlias, categorySlug, warehouseId);
      processedCount++;
    } catch (error) {
      console.error(`  ✗ Error processing item ${itemData.slug}:`, error);
    }
  }

  console.log(`\n✅ Seeding completed! Processed ${processedCount} items.\n`);
}

if (require.main === module) {
  const [,, filePath, warehouseId, locale = 'pl'] = process.argv;
  if (!filePath || !warehouseId) {
    console.error('Usage: ts-node scripts/seed-from-json.ts <path-to-json> <warehouseId> [locale]');
    process.exit(1);
  }

  seedFromJson(filePath, warehouseId, locale).catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
}
