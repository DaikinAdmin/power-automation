import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { item, category, subcategories } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { parseExcelToJson } from './excel-parser';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/postgres'
});
const db = drizzle(pool);

async function migrateItemCategorySlugs() {
  console.log('🔄 Starting migration of item.categorySlug from IDs to slugs...\n');

  // Parse Excel to get the original data
  const parsed = parseExcelToJson('./src/resources/f6b877e1595c2ca7e216e3129665c4f4.xlsx', 'ua');

  // Get all categories and subcategories
  const categories = await db.select().from(category);
  const subs = await db.select().from(subcategories);

  const categoryMap = new Map(categories.map(c => [c.name, c]));
  const subcategoryMap = new Map(subs.map(s => [s.name, s]));

  // Create a map from Ukrainian names to English for lookups
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

  let updatedCount = 0;
  let errorCount = 0;

  for (const itemData of parsed.items) {
    try {
      const categoryEnglish = translations[itemData.categoryName];
      const cat = categoryMap.get(categoryEnglish);

      if (!cat) {
        console.error(`  ✗ Category not found: ${itemData.categoryName} (${categoryEnglish})`);
        errorCount++;
        continue;
      }

      let newCategorySlug: string;

      if (itemData.subcategoryName) {
        // Extract subcategory name after "/"
        const subcategoryOnly = itemData.subcategoryName.includes('/')
          ? itemData.subcategoryName.split('/')[1].trim()
          : itemData.subcategoryName;
        
        const subcategoryEnglish = translations[subcategoryOnly];
        const subcat = subcategoryMap.get(subcategoryEnglish);

        if (subcat) {
          newCategorySlug = subcat.slug;
        } else {
          console.warn(`  ⚠ Subcategory not found for ${itemData.articleId}, using category: ${subcategoryOnly}`);
          newCategorySlug = cat.slug;
        }
      } else {
        newCategorySlug = cat.slug;
      }

      // Update the item
      await db
        .update(item)
        .set({ categorySlug: newCategorySlug })
        .where(eq(item.articleId, itemData.articleId));

      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log(`  ✓ Updated ${updatedCount} items...`);
      }
    } catch (error) {
      console.error(`  ✗ Error updating ${itemData.articleId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Updated: ${updatedCount} items`);
  console.log(`   Errors: ${errorCount} items`);

  await pool.end();
}

migrateItemCategorySlugs();
