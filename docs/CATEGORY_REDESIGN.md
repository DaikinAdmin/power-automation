# Category/Subcategory Redesign Summary

## Overview
Redesigned the items API to use a single `categorySlug` field instead of separate `categorySlug` and `subCategorySlug` fields. This simplifies the data model while maintaining full functionality.

## Changes Made

### 1. Data Model Simplification
- **Before**: Items had both `categorySlug` and `subCategorySlug` fields
- **After**: Items only use `categorySlug` field, which can reference either a category OR a subcategory

### 2. Storage Logic (POST/PUT)
When creating or updating an item:
1. Accept single `categorySlug` field from request
2. Check if it exists in `categories` table
3. If not found, check if it exists in `subcategories` table
4. Store the slug in `item.categorySlug`
5. Always set `item.subCategorySlug` to `null`

### 3. Retrieval Logic (GET)
When fetching an item:
1. Check if `item.categorySlug` exists in `categories` table
2. **If found as category**: 
   - Return category object with its subcategories
   - Set `subCategory` to `null`
3. **If found as subcategory**:
   - Fetch the subcategory object
   - Fetch the parent category with all its subcategories
   - Return both `category` (parent) and `subCategory` objects

## Modified Files

### `/src/app/api/admin/items/route.ts`
- **GET Method**: Migrated to Drizzle with conditional category lookup
- **POST Method**: Migrated to Drizzle with single categorySlug field
  - Accepts `categorySlug` only (no `subCategorySlug`)
  - Determines if it's a category or subcategory
  - Manually creates itemPrice and itemDetails records
  - Creates itemPriceHistory entries

### `/src/app/api/admin/items/[articleId]/route.ts`
- **GET Method**: Updated to use conditional category lookup
  - Checks categories first, then subcategories
  - Returns appropriate category/subCategory structure
- **PUT Method**: Migrated to Drizzle with single categorySlug field
  - Deletes existing prices and details
  - Updates item with new categorySlug
  - Recreates prices, details, and history

## Benefits

1. **Simplified API**: Frontend only needs to provide one field
2. **Flexible**: Supports both category-level and subcategory-level items
3. **Consistent**: Same logic across GET, POST, and PUT methods
4. **Type-safe**: Full Drizzle ORM implementation with TypeScript
5. **Backward Compatible**: API response structure remains the same

## Response Structure

### When item linked to category:
```typescript
{
  ...item,
  category: {
    id: "...",
    name: "...",
    slug: "...",
    subCategories: [...]
  },
  subCategory: null,
  ...
}
```

### When item linked to subcategory:
```typescript
{
  ...item,
  category: {
    id: "...",
    name: "Parent Category",
    slug: "parent-slug",
    subCategories: [...]
  },
  subCategory: {
    id: "...",
    name: "Subcategory",
    slug: "subcategory-slug",
    categorySlug: "parent-slug"
  },
  ...
}
```

## Implementation Details

### Category Lookup Function (used in all methods):
```typescript
if (item.categorySlug) {
  // Check if it's a category
  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.slug, item.categorySlug))
    .limit(1);

  if (category) {
    // It's a category - fetch subcategories
    const subCategories = await db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.categorySlug, category.slug));
    return { category: { ...category, subCategories }, subCategory: null };
  } else {
    // Check if it's a subcategory
    const [subCategory] = await db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.slug, item.categorySlug))
      .limit(1);

    if (subCategory) {
      // Fetch parent category
      const [parentCategory] = await db
        .select()
        .from(schema.category)
        .where(eq(schema.category.slug, subCategory.categorySlug))
        .limit(1);
      return { category: parentCategory, subCategory };
    }
  }
}
```

## Migration Status

✅ **Completed**:
- GET `/api/admin/items` - List all items
- POST `/api/admin/items` - Create new item
- GET `/api/admin/items/[articleId]` - Get item details
- PUT `/api/admin/items/[articleId]` - Update item

✅ **Features**:
- Single categorySlug field handling
- Conditional category/subcategory lookup
- Full Drizzle ORM implementation
- Prisma code preserved (commented)
- itemPrice and itemDetails creation
- itemPriceHistory tracking
- Error-free compilation

## Testing Recommendations

1. **Test Category-level items**: Create item with category slug, verify category returned
2. **Test Subcategory-level items**: Create item with subcategory slug, verify both category and subCategory returned
3. **Test Updates**: Update item from category to subcategory and vice versa
4. **Test Edge Cases**: Non-existent slugs, null categorySlug, etc.

## Notes

- All Prisma code has been preserved in comments for reference
- The `subCategorySlug` field in the database is always set to `null` with the new logic
- Frontend changes may be needed to only send `categorySlug` instead of both fields
- The API response structure remains backward compatible
