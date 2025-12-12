import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { 
  brand, 
  category, 
  subcategories, 
  item, 
  itemDetails, 
  itemPrice,
  warehouse,
  categoryTranslation,
  subcategoryTranslation
} from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseExcelToJson, ParsedItemData, ExcelToJsonResult } from './excel-parser';
import * as crypto from 'crypto';

// Create database connection directly with pg Pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres'
});
const db = drizzle(pool);

/**
 * Simple function to create a slug from text
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Translation dictionary for Ukrainian to English
 */
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
  
  // Subcategories
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

/**
 * Translation helper - translates Ukrainian to English
 */
function translateToEnglish(text: string, locale: string): string {
  if (locale === 'ua') {
    return translations[text] || text;
  }
  return text;
}

/**
 * Get or create a brand
 */
async function getOrCreateBrand(brandName: string): Promise<string> {
  if (!brandName) {
    throw new Error('Brand name is required');
  }
  
  const alias = createSlug(brandName);
  
  // Check if brand already exists
  const existingBrands = await db
    .select()
    .from(brand)
    .where(eq(brand.alias, alias));
  
  if (existingBrands.length > 0) {
    console.log(`  → Brand "${brandName}" already exists`);
    return alias;
  }
  
  // Create new brand
  const newBrand = await db
    .insert(brand)
    .values({
      id: generateId(),
      name: brandName,
      alias: alias,
      imageLink: '/imgs/brands/default.png', // Default image
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .returning();
  
  console.log(`  ✓ Created brand: ${brandName}`);
  return alias;
}

/**
 * Get or create a category with translations
 */
async function getOrCreateCategory(
  categoryName: string, 
  locale: string
): Promise<{ id: string; slug: string }> {
  const englishName = translateToEnglish(categoryName, locale);
  const slug = createSlug(englishName);
  
  // Check if category already exists
  const existingCategories = await db
    .select()
    .from(category)
    .where(eq(category.slug, slug));
  
  if (existingCategories.length > 0) {
    const existingCategory = existingCategories[0];
    
    // Check if translation exists for this locale
    if (locale !== 'en') {
      const existingTranslations = await db
        .select()
        .from(categoryTranslation)
        .where(
          and(
            eq(categoryTranslation.categorySlug, existingCategory.slug),
            eq(categoryTranslation.locale, locale)
          )
        );
      
      if (existingTranslations.length === 0) {
        // Add translation
        await db
          .insert(categoryTranslation)
          .values({
            id: generateId(),
            categorySlug: existingCategory.slug,
            locale: locale,
            name: categoryName
          });
        console.log(`  ✓ Added ${locale} translation for category: ${englishName}`);
      }
    }
    
    console.log(`  → Category "${categoryName}" already exists`);
    return { id: existingCategory.id, slug: existingCategory.slug };
  }
  
  // Create new category
  const categoryId = generateId();
  await db
    .insert(category)
    .values({
      id: categoryId,
      name: englishName,
      slug: slug,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  
  // Add translation if not English
  if (locale !== 'en') {
    await db
      .insert(categoryTranslation)
      .values({
        id: generateId(),
        categorySlug: slug,
        locale: locale,
        name: categoryName
      });
  }
  
  console.log(`  ✓ Created category: ${englishName} (${locale})`);
  return { id: categoryId, slug };
}

/**
 * Get or create a subcategory with translations
 */
async function getOrCreateSubcategory(
  subcategoryName: string,
  parentCategorySlug: string,
  locale: string
): Promise<{ id: string; slug: string }> {
  // Extract the subcategory part after "/" if it exists
  const subcategoryOnly = subcategoryName.includes('/') 
    ? subcategoryName.split('/')[1].trim() 
    : subcategoryName;
  
  const englishName = translateToEnglish(subcategoryOnly, locale);
  const slug = createSlug(englishName);
  
  // Check if subcategory already exists
  const existingSubcategories = await db
    .select()
    .from(subcategories)
    .where(
      and(
        eq(subcategories.slug, slug),
        eq(subcategories.categorySlug, parentCategorySlug)
      )
    );
  
  if (existingSubcategories.length > 0) {
    const existingSubcategory = existingSubcategories[0];
    
    // Check if translation exists for this locale
    if (locale !== 'en') {
      const existingTranslations = await db
        .select()
        .from(subcategoryTranslation)
        .where(
          and(
            eq(subcategoryTranslation.subCategorySlug, existingSubcategory.slug),
            eq(subcategoryTranslation.locale, locale)
          )
        );
      
      if (existingTranslations.length === 0) {
        // Add translation
        await db
          .insert(subcategoryTranslation)
          .values({
            id: generateId(),
            subCategorySlug: existingSubcategory.slug,
            locale: locale,
            name: subcategoryOnly
          });
        console.log(`  ✓ Added ${locale} translation for subcategory: ${englishName}`);
      }
    }
    
    console.log(`  → Subcategory "${englishName}" already exists`);
    return { id: existingSubcategory.id, slug: existingSubcategory.slug };
  }
  
  // Create new subcategory
  const subcategoryId = generateId();
  await db
    .insert(subcategories)
    .values({
      id: subcategoryId,
      name: englishName,
      slug: slug,
      categorySlug: parentCategorySlug,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  
  // Add translation if not English
  if (locale !== 'en') {
    await db
      .insert(subcategoryTranslation)
      .values({
        id: generateId(),
        subCategorySlug: slug,
        locale: locale,
        name: subcategoryOnly
      });
  }
  
  console.log(`  ✓ Created subcategory: ${englishName} (${locale})`);
  return { id: subcategoryId, slug };
}

/**
 * Create or update an item
 */
async function createOrUpdateItem(
  itemData: ParsedItemData,
  brandAlias: string | null,
  categorySlug: string,
  warehouseId: string
): Promise<void> {
  const itemId = generateId();
  
  // Check if item already exists
  const existingItems = await db
    .select()
    .from(item)
    .where(eq(item.articleId, itemData.articleId));
  
  let currentItemId: string;
  
  if (existingItems.length > 0) {
    // Update existing item
    currentItemId = existingItems[0].id;
    
    await db
      .update(item)
      .set({
        slug: itemData.slug,
        isDisplayed: itemData.isDisplayed,
        brandSlug: brandAlias,
        categorySlug: categorySlug,
        itemImageLink: itemData.itemImageLink,
        updatedAt: new Date().toISOString()
      })
      .where(eq(item.id, currentItemId));
    
    console.log(`  ↻ Updated item: ${itemData.articleId}`);
  } else {
    // Create new item
    currentItemId = itemId;
    
    await db
      .insert(item)
      .values({
        id: currentItemId,
        articleId: itemData.articleId,
        slug: itemData.slug,
        isDisplayed: itemData.isDisplayed,
        brandSlug: brandAlias,
        categorySlug: categorySlug,
        itemImageLink: itemData.itemImageLink,
        sellCounter: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    
    console.log(`  ✓ Created item: ${itemData.articleId}`);
  }
  
  // Create or update item details for the locale
  const existingDetails = await db
    .select()
    .from(itemDetails)
    .where(
      and(
        eq(itemDetails.itemSlug, itemData.articleId),
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
        itemSlug: itemData.articleId
      });
  }
  
  // Create or update item price for the warehouse
  const existingPrices = await db
    .select()
    .from(itemPrice)
    .where(
      and(
        eq(itemPrice.itemSlug, itemData.articleId),
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
        itemSlug: itemData.articleId,
        warehouseId: warehouseId,
        price: itemData.price,
        quantity: itemData.quantity || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
  }
}

/**
 * Main seeding function
 */
export async function seedFromExcel(
  filePath: string,
  warehouseId: string,
  locale: string = 'ua'
): Promise<void> {
  console.log('\n🌱 Starting database seeding from Excel...\n');
  console.log(`📄 File: ${filePath}`);
  console.log(`🏢 Warehouse ID: ${warehouseId}`);
  console.log(`🌍 Locale: ${locale}\n`);
  
  try {
    // Parse Excel file
    console.log('📊 Parsing Excel file...');
    const parsedData = parseExcelToJson(filePath, locale);
    console.log(`  ✓ Found ${parsedData.items.length} items`);
    console.log(`  ✓ Found ${parsedData.brands.size} unique brands`);
    console.log(`  ✓ Found ${parsedData.categories.size} unique categories`);
    console.log(`  ✓ Found ${parsedData.subcategories.size} unique subcategories\n`);
    
    // Verify warehouse exists
    const warehouses = await db
      .select()
      .from(warehouse)
      .where(eq(warehouse.id, warehouseId));
    
    if (warehouses.length === 0) {
      throw new Error(`Warehouse with ID "${warehouseId}" not found`);
    }
    
    // Process brands
    console.log('🏷️  Processing brands...');
    const brandMap = new Map<string, string>();
    for (const brandName of parsedData.brands) {
      const alias = await getOrCreateBrand(brandName);
      brandMap.set(brandName, alias);
    }
    console.log('');
    
    // Process categories
    console.log('📁 Processing categories...');
    const categoryMap = new Map<string, { id: string; slug: string }>();
    for (const categoryName of parsedData.categories) {
      const cat = await getOrCreateCategory(categoryName, locale);
      categoryMap.set(categoryName, cat);
    }
    console.log('');
    
    // Process subcategories
    console.log('📂 Processing subcategories...');
    const subcategoryMap = new Map<string, { id: string; slug: string }>();
    for (const [subcategoryName, parentCategoryName] of parsedData.subcategories) {
      const parentCategory = categoryMap.get(parentCategoryName);
      if (parentCategory) {
        const subcat = await getOrCreateSubcategory(
          subcategoryName, 
          parentCategory.slug, 
          locale
        );
        subcategoryMap.set(subcategoryName, subcat);
      }
    }
    console.log('');
    
    // Process items
    console.log('📦 Processing items...');
    let processedCount = 0;
    for (const itemData of parsedData.items) {
      try {
        const brandAlias = itemData.brandName ? brandMap.get(itemData.brandName) || null : null;
        
        // Determine categorySlug based on whether there's a subcategory
        let categorySlugToUse: string;
        if (itemData.subcategoryName) {
          const subcat = subcategoryMap.get(itemData.subcategoryName);
          categorySlugToUse = subcat ? subcat.slug : categoryMap.get(itemData.categoryName)!.slug;
        } else {
          categorySlugToUse = categoryMap.get(itemData.categoryName)!.slug;
        }
        
        await createOrUpdateItem(itemData, brandAlias, categorySlugToUse, warehouseId);
        processedCount++;
      } catch (error) {
        console.error(`  ✗ Error processing item ${itemData.articleId}:`, error);
      }
    }
    console.log(`\n✅ Seeding completed! Processed ${processedCount} items.\n`);
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}
