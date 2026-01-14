# Excel Database Seeding Guide

This guide explains how to seed your database from Excel files according to the mapping specified in SEED_INSTRUCTIONS.md.

## 📋 Prerequisites

1. Make sure you have a warehouse created in your database
2. Have your Excel file ready with the correct column structure
3. Ensure the database connection is configured in your `.env` file

## 🗂️ Excel File Column Mapping

The scripts expect the following column structure:

| Column | Field | Description |
|--------|-------|-------------|
| A | articleId | Unique product identifier |
| D | itemName | Product name (locale-specific) |
| F | slug | URL-friendly product identifier |
| G | brandName | Brand name |
| H | categoryName | Parent category name |
| I | subcategoryName | Subcategory name (optional) |
| J | price | Product price |
| M | isDisplayed | Visibility status (true/false) |
| N | quantity | Stock quantity |
| O | itemImageLink | Image URLs (comma-separated) |
| P | seller | Seller name (optional) |
| Q | description | Product description (locale-specific) |
| R | specifications | Technical specifications (locale-specific) |
| U | metaKeywords | SEO keywords (locale-specific) |
| V | metaDescription | SEO description (locale-specific) |

## 🚀 Usage

### 1. Convert Excel to JSON (Optional - for inspection)

First, you can convert your Excel file to JSON to verify the data is parsed correctly:

```bash
npm run excel:to-json -- <excel-file-path> [output-json-path] [locale]
```

**Examples:**

```bash
# Convert with default output path (same directory as input)
npm run excel:to-json -- ./src/resources/data.xlsx

# Specify output path and locale
npm run excel:to-json -- ./src/resources/data.xlsx ./parsed-data.json ua

# Using a different locale
npm run excel:to-json -- ./data.xlsx ./output.json pl
```

### 2. Seed Database from Excel

To populate the database with data from your Excel file:

```bash
npm run seed:excel -- <excel-file-path> <warehouse-id> [locale]
```

**Examples:**

```bash
# Seed with Ukrainian locale (default)
npm run seed:excel -- ./src/resources/data.xlsx warehouse-1 ua

# Seed with Polish locale
npm run seed:excel -- ./data.xlsx warehouse-poland pl

# Seed with English locale
npm run seed:excel -- ./public/sample-data/items_sample.xlsx warehouse-1 en
```

**Parameters:**
- `<excel-file-path>`: Path to your Excel file (.xlsx or .xls)
- `<warehouse-id>`: The warehouse ID where items will be stored
- `[locale]`: The language code (ua, pl, en, es) - defaults to 'ua'

## 🔄 What the Script Does

### 1. Parses Excel File
- Reads all rows from the Excel file
- Maps columns to database fields
- Extracts unique brands, categories, and subcategories

### 2. Creates/Updates Brands
- Checks if each brand already exists
- Creates new brands with slugified aliases
- Sets default brand image

### 3. Creates/Updates Categories
- Checks if each category already exists
- Creates English version of category name (base)
- Creates category translations for the specified locale
- Generates URL-friendly slugs

### 4. Creates/Updates Subcategories
- Links subcategories to their parent categories
- Creates English version of subcategory name (base)
- Creates subcategory translations for the specified locale
- Generates URL-friendly slugs

### 5. Creates/Updates Items
- Creates or updates item records
- Links items to brands and categories (or subcategories)
- Creates locale-specific item details (name, description, etc.)
- Creates item prices for the specified warehouse
- Handles multiple product images

## 📊 Database Structure

The script populates these tables:

- **brand** - Brand information
- **category** - Main categories (English base)
- **category_translation** - Category translations for different locales
- **subcategories** - Subcategories linked to categories
- **subcategory_translation** - Subcategory translations
- **item** - Main item records
- **item_details** - Locale-specific item information
- **item_price** - Warehouse-specific pricing and stock

## 🌍 Supported Locales

- `ua` - Ukrainian (Українська)
- `pl` - Polish (Polski)
- `en` - English
- `es` - Spanish (Español)

## 💡 Tips

### Finding Your Warehouse ID

You can find warehouse IDs by querying your database:

```sql
SELECT id, name, displayedName FROM warehouse WHERE isVisible = true;
```

Or create a new warehouse:

```sql
INSERT INTO warehouse (id, name, displayedName, isVisible, createdAt, updatedAt)
VALUES ('warehouse-1', 'main', 'Main Warehouse', true, NOW(), NOW());
```

### Handling Multiple Warehouses

If you have items for different warehouses, run the script multiple times with different warehouse IDs:

```bash
npm run seed:excel -- ./data-poland.xlsx warehouse-poland pl
npm run seed:excel -- ./data-ukraine.xlsx warehouse-ukraine ua
```

### Updating Existing Data

The script is **idempotent** - it can be run multiple times safely:
- Existing brands, categories, and subcategories are reused
- Existing items are updated instead of duplicated
- Translations are added if missing for a locale

### Error Handling

If the script encounters errors:
- Check that the warehouse ID exists
- Verify the Excel file structure matches the expected format
- Ensure all required columns (A, D, F, G, H, J) have values
- Check database connection settings

## 🧪 Testing

Before seeding production data, test with a small sample:

1. Create a test Excel file with 5-10 items
2. Run the conversion to JSON to verify parsing:
   ```bash
   npm run excel:to-json -- ./test-data.xlsx ./test-output.json ua
   ```
3. Inspect the JSON output
4. Run the seeding on a test database:
   ```bash
   npm run seed:excel -- ./test-data.xlsx test-warehouse ua
   npx tsx scripts/seed-from-json src/resources/parsed-data-pl.json warehouse-1 pl
   ```

## 📁 Example Files

Example Excel files can be found in:
- `./public/sample-data/items_sample.xlsx`
- `./src/resources/data.xlsx`

## 🐛 Troubleshooting

### "Warehouse not found" Error
- Ensure the warehouse ID exists in the database
- Check for typos in the warehouse ID

### "File not found" Error
- Verify the file path is correct
- Use absolute paths or paths relative to the project root

### Translation Issues
- Currently, the script uses the original text as English base
- For proper translations, you may want to integrate a translation API
- Edit the `translateToEnglish()` function in `seed-from-excel.ts`

### Database Connection Issues
- Check your `.env` file has the correct `DATABASE_URL`
- Ensure the database is running and accessible

## 🔧 Advanced Usage

### Custom Translation Logic

To implement custom translation logic, edit the `translateToEnglish()` function in `scripts/seed-from-excel.ts`:

```typescript
function translateToEnglish(text: string, locale: string): string {
  // Add your translation logic here
  // Could use a translation API or dictionary
  return translatedText;
}
```

### Modifying Column Mapping

If your Excel file has a different column structure, edit the column indices in `scripts/excel-parser.ts`:

```typescript
const articleId = String(row[0] || '').trim();  // Column A (index 0)
const itemName = String(row[3] || '').trim();   // Column D (index 3)
// ... etc
```

## 📝 Notes

- The script generates UUIDs for all new records
- Image links are stored as arrays to support multiple images per item
- Slugs are automatically generated from names
- All timestamps use ISO 8601 format
- Boolean fields in Excel should be "true" or "false" (case-insensitive)
