# API Migration Summary - Prisma to Drizzle

## Overview

This document summarizes the migration from Prisma to Drizzle ORM for the Power Automation project APIs.

## Completed Migrations

### ✅ Public Endpoints

1. **GET `/api/public/categories/[locale]`**
   - File: `src/app/api/public/categories/[locale]/route.ts`
   - Helper: `getCategoriesByLocale()` in `src/helpers/db/queries.ts`
   - Returns: `CategoryResponse[]`

2. **GET `/api/public/items/[locale]`**
   - File: `src/app/api/public/items/[locale]/route.ts`
   - Helper: `getItemsByLocale()` in `src/helpers/db/items-queries.ts`
   - Returns: `ItemListResponse[]`

3. **GET `/api/public/items/[locale]/[slug]`**
   - File: `src/app/api/public/items/[locale]/[slug]/route.ts`
   - Helper: `getItemByArticleId()` in `src/helpers/db/queries.ts`
   - Returns: Formatted `ItemResponse`

### ✅ Admin Endpoints

1. **GET `/api/admin/categories`**
   - File: `src/app/api/admin/categories/route.ts`
   - Inline Drizzle queries (categories + subcategories)
   - Returns: Categories with subcategories

2. **GET `/api/admin/users`**
   - File: `src/app/api/admin/users/route.ts`
   - Helper: `isUserAdmin()` in `src/helpers/db/queries.ts`
   - Returns: `UserListResponse[]`

## Pending Migrations

### 🔄 Admin Endpoints

- [ ] `/api/admin/brands` - GET, POST
- [ ] `/api/admin/brands/[brandId]` - GET, PUT, DELETE
- [ ] `/api/admin/categories/[slug]` - GET, PUT, DELETE
- [ ] `/api/admin/currency-exchange` - GET, POST, PUT
- [ ] `/api/admin/dashboard/recent-orders` - GET
- [ ] `/api/admin/dashboard/stats` - GET
- [ ] `/api/admin/discount-levels` - GET, POST
- [ ] `/api/admin/discount-levels/[id]` - GET, PUT, DELETE
- [ ] `/api/admin/items` - GET, POST
- [ ] `/api/admin/items/[articleId]` - GET, PUT, DELETE
- [ ] `/api/admin/items/[articleId]/setVisible` - PUT
- [ ] `/api/admin/items/bulk-upload` - POST
- [ ] `/api/admin/items/export` - GET
- [ ] `/api/admin/orders` - GET
- [ ] `/api/admin/orders/[id]` - GET, PUT
- [ ] `/api/admin/users/[id]` - GET, PUT, DELETE
- [ ] `/api/admin/warehouses` - GET, POST
- [ ] `/api/admin/warehouses/[warehouseId]` - GET, PUT, DELETE

### 🔄 Other Endpoints

- [ ] `/api/orders` - GET, POST
- [ ] `/api/orders/[id]` - GET
- [ ] `/api/search` - GET
- [ ] `/api/user/role/[userId]` - GET, PUT

## Migration Pattern

### Step 1: Import Changes

```typescript
// Before (Prisma)
import prisma from '@/db';

// After (Drizzle)
import { db } from '@/db';
import { eq, and, or, desc, asc, like, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
```

### Step 2: Query Pattern

```typescript
// Prisma Pattern
const users = await prisma.user.findMany({
  where: { role: 'admin' },
  include: { orders: true },
  orderBy: { createdAt: 'desc' }
});

// Drizzle Pattern
const users = await db
  .select()
  .from(schema.user)
  .where(eq(schema.user.role, 'admin'))
  .orderBy(desc(schema.user.createdAt));

// Manual relation loading
const orders = await db
  .select()
  .from(schema.order)
  .where(sql`${schema.order.userId} = ANY(${userIds})`);
```

### Step 3: Comment Out Prisma Code

```typescript
export async function GET() {
  // Drizzle implementation
  const data = await db.select().from(schema.table);
  
  /* Prisma implementation (commented out)
  const data = await prisma.table.findMany();
  */
  
  return NextResponse.json(data);
}
```

### Step 4: Create Helper Functions

For complex queries, create reusable helpers in:
- `src/helpers/db/queries.ts` - General queries
- `src/helpers/db/items-queries.ts` - Item-specific queries
- `src/helpers/db/orders-queries.ts` - Order-specific queries (to be created)

## Key Differences

### 1. Relations
- **Prisma**: Automatic with `include`
- **Drizzle**: Manual loading required

### 2. Filters
```typescript
// Prisma
where: { 
  AND: [
    { status: 'active' },
    { role: 'admin' }
  ]
}

// Drizzle
where: and(
  eq(schema.table.status, 'active'),
  eq(schema.table.role, 'admin')
)
```

### 3. Ordering
```typescript
// Prisma
orderBy: { createdAt: 'desc' }

// Drizzle
orderBy: desc(schema.table.createdAt)
```

### 4. Joins
```typescript
// Drizzle left join example
const result = await db
  .select()
  .from(schema.item)
  .leftJoin(schema.brand, eq(schema.item.brandSlug, schema.brand.alias));
```

### 5. Array Filters
```typescript
// Drizzle - using sql for ANY
where: sql`${schema.table.id} = ANY(${arrayOfIds})`

// Drizzle - using in
where: inArray(schema.table.id, arrayOfIds)
```

## Response Type Mapping

All responses should map to interfaces defined in `src/helpers/types/api-responses.ts`:

| Entity | Response Type | Notes |
|--------|--------------|-------|
| Category | `CategoryResponse` | With subcategories |
| Item (list) | `ItemListResponse[]` | Simplified for listings |
| Item (detail) | `ItemResponse` | Full details with prices |
| Brand | `BrandResponse` | Brand information |
| Warehouse | `WarehouseResponse` | With country data |
| Order (list) | `OrderListResponse[]` | Summary view |
| Order (detail) | `OrderResponse` | Full order with items |
| User (list) | `UserListResponse[]` | Admin view |
| User (detail) | `UserResponse` | Full user profile |

## ID to Slug Migration

### Already Using Slugs
- ✅ Categories: `categorySlug`
- ✅ Subcategories: `subCategorySlug`
- ✅ Brands: `brandSlug` (uses `alias` field)
- ✅ Items: `articleId` (acts as slug)

### Need Slug Migration
- ⚠️ Warehouses: Currently using `id`, should add proper `slug` field
- ⚠️ Users: Using `id` (keep as is for security)
- ⚠️ Orders: Using `id` (keep as is)
- ⚠️ Discount Levels: Using `id` (could use `level` field)

## Testing Checklist

After migrating each endpoint:

1. [ ] Test successful response with valid data
2. [ ] Test with invalid locale (should return 400)
3. [ ] Test authentication (401 for missing auth)
4. [ ] Test authorization (403 for insufficient permissions)
5. [ ] Test with missing data (404 for not found)
6. [ ] Test error handling (500 for server errors)
7. [ ] Verify response structure matches TypeScript interface
8. [ ] Check that slugs are used consistently
9. [ ] Verify locale filtering works correctly
10. [ ] Test caching headers are set properly

## Common Drizzle Operators

```typescript
import { 
  eq,      // equality: column = value
  ne,      // not equal: column != value
  gt,      // greater than: column > value
  gte,     // greater than or equal: column >= value
  lt,      // less than: column < value
  lte,     // less than or equal: column <= value
  like,    // pattern matching: column LIKE pattern
  ilike,   // case-insensitive LIKE
  inArray, // IN array: column IN (values)
  notInArray, // NOT IN array
  isNull,  // IS NULL
  isNotNull, // IS NOT NULL
  and,     // AND condition
  or,      // OR condition
  not,     // NOT condition
  sql,     // Raw SQL
  desc,    // ORDER BY DESC
  asc,     // ORDER BY ASC
} from 'drizzle-orm';
```

## Helper Functions Available

### In `src/helpers/db/queries.ts`

- `getCategoriesByLocale(locale: string): Promise<CategoryResponse[]>`
- `getCategoryBySlug(slug: string, locale: string): Promise<CategoryResponse | null>`
- `getAllBrands(): Promise<BrandResponse[]>`
- `getBrandByAlias(alias: string): Promise<BrandResponse | null>`
- `getAllWarehouses(): Promise<WarehouseResponse[]>`
- `getItemByArticleId(articleId: string, locale: string): Promise<ItemResponse | null>`
- `getUserRole(userId: string): Promise<string | null>`
- `isUserAdmin(userId: string): Promise<boolean>`

### In `src/helpers/db/items-queries.ts`

- `getItemsByLocale(locale: string): Promise<ItemListResponse[]>`

## Next Steps

1. Create `src/helpers/db/orders-queries.ts` for order-related queries
2. Create `src/helpers/db/admin-queries.ts` for admin-specific complex queries
3. Migrate remaining admin endpoints systematically
4. Migrate order endpoints
5. Migrate search endpoint
6. Add proper warehouse slug field to schema
7. Update integration tests
8. Performance testing and optimization

## Notes

- All Prisma code is preserved in comments for reference
- Helper functions centralize common query patterns
- Response types ensure type safety across frontend/backend
- Slug-based identifiers improve URL readability and SEO
- Locale handling is consistent across all endpoints
- Error handling follows consistent patterns
- Cache headers are preserved where applicable

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Query Examples](https://orm.drizzle.team/docs/select)
- [Project Schema Documentation](./SCHEMA.md)
- [Type Definitions](./src/helpers/types/api-responses.ts)
