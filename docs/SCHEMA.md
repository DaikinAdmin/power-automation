# API Schema Documentation

This document describes the API endpoints and their response structures after migration to Drizzle ORM.

## Key Changes

1. **Using Slugs Instead of IDs**: All references now use human-readable slugs (e.g., `categorySlug`, `brandSlug`, `warehouseSlug`) instead of UUIDs
2. **Locale-based Responses**: All endpoints return data in the requested locale with proper fallbacks
3. **Flat Response Structure**: Responses are flattened to reduce nesting and improve frontend usability
4. **Type-safe Responses**: All responses conform to TypeScript interfaces defined in `/src/helpers/types/api-responses.ts`

---

## Public Endpoints

### GET /api/public/categories/[locale]

Returns all visible categories with subcategories translated to the specified locale.

**Parameters:**
- `locale` (path): Language code (`pl`, `en`, `ua`, `es`)

**Response Type:** `CategoryResponse[]`

**Response Structure:**
```typescript
[
  {
    slug: string;                    // Category identifier
    name: string;                    // Localized category name
    isVisible: boolean;
    createdAt: string;              // ISO 8601 timestamp
    updatedAt: string;              // ISO 8601 timestamp
    subCategories: [
      {
        slug: string;                // Subcategory identifier
        name: string;                // Localized subcategory name
        categorySlug: string;        // Parent category slug
        isVisible: boolean;
        createdAt: string;
        updatedAt: string;
      }
    ]
  }
]
```

**Example:**
```json
[
  {
    "slug": "electronics",
    "name": "Elektronika",
    "isVisible": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "subCategories": [
      {
        "slug": "smartphones",
        "name": "Smartfony",
        "categorySlug": "electronics",
        "isVisible": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
]
```

---

### GET /api/public/items/[locale]/[slug]

Returns detailed information about a specific item, including pricing across warehouses, brand, and category information.

**Parameters:**
- `locale` (path): Language code (`pl`, `en`, `ua`, `es`)
- `slug` (path): Item article ID

**Response Type:** Formatted `ItemResponse`

**Response Structure:**
```typescript
{
  id: string;                        // Article ID (backwards compatibility)
  articleId: string;                 // Primary item identifier
  itemImageLink: string[];           // Array of image URLs
  isDisplayed: boolean;
  sellCounter: number | null;
  createdAt: string;
  updatedAt: string;
  
  prices: [                          // Pricing across all warehouses
    {
      warehouseSlug: string;
      warehouseName: string;
      warehouseCountry: string;
      displayedName: string;
      price: string;                 // Formatted with currency
      specialPrice: string | null;   // Promotional price if available
      originalPrice: string;
      inStock: boolean;
      quantity: number;
      badge: string | null;          // e.g., "BESTSELLER", "NEW_ARRIVALS"
      promoEndDate: string | null;
      promoCode: string | null;
    }
  ];
  
  name: string;                      // Localized item name
  brandName: string | null;
  brandImage: string | null;
  brandSlug: string | null;
  description: string;               // Localized description
  specifications: string;            // Localized specifications
  seller: string;
  discount: number;
  popularity: number;
  badge: string | null;
  warrantyMonths: number;
  warrantyType: string | null;
  
  categoryName: string;              // Localized category name
  categorySlug: string;
  subcategory: SubCategoryResponse[];
  
  recommendedWarehouse: {            // First in-stock warehouse
    warehouse: {
      slug: string;
      name: string;
      country: string;
      displayedName: string;
    };
    price: number;
    promotionPrice: number | null;
    quantity: number;
    badge: string | null;
  } | undefined;
}
```

**Example:**
```json
{
  "id": "ART-12345",
  "articleId": "ART-12345",
  "itemImageLink": ["https://example.com/img1.jpg"],
  "isDisplayed": true,
  "sellCounter": 150,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-02-20T14:20:00Z",
  "prices": [
    {
      "warehouseSlug": "warehouse-pl-01",
      "warehouseName": "Warsaw Warehouse",
      "warehouseCountry": "Poland",
      "displayedName": "Magazyn Warszawa",
      "price": "299.99 €",
      "specialPrice": "249.99 €",
      "originalPrice": "299.99 €",
      "inStock": true,
      "quantity": 45,
      "badge": "HOT_DEALS",
      "promoEndDate": "2024-12-31T23:59:59Z",
      "promoCode": "WINTER2024"
    }
  ],
  "name": "Przykładowy Produkt",
  "brandName": "BrandName",
  "brandImage": "https://example.com/brand.jpg",
  "brandSlug": "brandname",
  "description": "Szczegółowy opis produktu...",
  "specifications": "Specyfikacja techniczna...",
  "seller": "Official Store",
  "discount": 0.15,
  "popularity": 95,
  "badge": "HOT_DEALS",
  "warrantyMonths": 24,
  "warrantyType": "Manufacturer",
  "categoryName": "Elektronika",
  "categorySlug": "electronics",
  "subcategory": [],
  "recommendedWarehouse": {
    "warehouse": {
      "slug": "warehouse-pl-01",
      "name": "Warsaw Warehouse",
      "country": "Poland",
      "displayedName": "Magazyn Warszawa"
    },
    "price": 249.99,
    "promotionPrice": null,
    "quantity": 45,
    "badge": "HOT_DEALS"
  }
}
```

---

## Admin Endpoints

### GET /api/admin/categories

Returns all categories with subcategories (admin view, no locale filtering).

**Authentication:** Required (Admin role)

**Response Type:** `CategoryResponse[]`

**Response Structure:** Similar to public categories endpoint but includes hidden categories.

---

### GET /api/admin/users

Returns list of all users.

**Authentication:** Required (Admin role)

**Response Type:** `UserListResponse[]`

**Response Structure:**
```typescript
[
  {
    userId: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    companyName: string | null;
    discountLevel: number | null;
    createdAt: string;
  }
]
```

---

### GET /api/admin/warehouses

Returns all warehouses with country information.

**Authentication:** Required (Admin role)

**Response Type:** `WarehouseResponse[]`

**Response Structure:**
```typescript
[
  {
    slug: string;
    name: string | null;
    displayedName: string;
    countrySlug: string | null;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
    country: {
      slug: string;
      name: string;
      countryCode: string;
      phoneCode: string | null;
      isActive: boolean;
    } | null;
  }
]
```

---

### GET /api/admin/brands

Returns all brands.

**Authentication:** Required (Admin role)

**Response Type:** `BrandResponse[]`

**Response Structure:**
```typescript
[
  {
    alias: string;                   // Brand slug/identifier
    name: string;
    imageLink: string;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
  }
]
```

---

## Order Endpoints

### GET /api/orders

Returns user's orders.

**Authentication:** Required

**Response Type:** `OrderListResponse[]`

**Response Structure:**
```typescript
[
  {
    orderId: string;
    totalPrice: string;
    status: string;                  // "NEW", "PROCESSING", etc.
    createdAt: string;
    itemCount: number;
  }
]
```

---

### GET /api/orders/[id]

Returns detailed order information.

**Authentication:** Required

**Parameters:**
- `id` (path): Order ID

**Response Type:** `OrderResponse`

**Response Structure:**
```typescript
{
  orderId: string;
  userId: string;
  totalPrice: string;
  originalTotalPrice: number;
  status: string;
  deliveryId: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  items: [
    {
      articleId: string;
      itemName: string;
      quantity: number;
      price: number;
      warehouseSlug: string;
    }
  ];
}
```

---

## Search Endpoint

### GET /api/search

Search for items by query string.

**Query Parameters:**
- `q` (string): Search query
- `locale` (string): Language code
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 20)

**Response Type:** `SearchResponse`

**Response Structure:**
```typescript
{
  items: [
    {
      articleId: string;
      itemName: string;
      description: string;
      itemImageLink: string[];
      brandSlug: string | null;
      brandName: string | null;
      categorySlug: string;
      price: number;
      promotionPrice: number | null;
    }
  ];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## Error Responses

All endpoints return consistent error responses:

```typescript
{
  error: string;                     // Error message
  success: false;
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Type Definitions

All response types are defined in `/src/helpers/types/api-responses.ts`.

Key interfaces:
- `CategoryResponse`
- `SubCategoryResponse`
- `ItemResponse`
- `ItemListResponse`
- `BrandResponse`
- `WarehouseResponse`
- `OrderResponse`
- `UserResponse`
- `SearchResponse`

---

## Migration Notes

### From Prisma to Drizzle

1. **Import Changes:**
   - Before: `import prisma from '@/db';`
   - After: `import { getCategoriesByLocale } from '@/helpers/db/queries';`

2. **Query Helpers:**
   - Common queries are abstracted into reusable functions in `/src/helpers/db/queries.ts`
   - Example: `getCategoriesByLocale()`, `getItemByArticleId()`, `getAllBrands()`

3. **Date Handling:**
   - Drizzle returns dates as strings (ISO 8601 format) when schema uses `mode: 'string'`
   - No `.toISOString()` conversion needed

4. **Relations:**
   - Drizzle doesn't auto-load relations
   - Manual joins or multiple queries required
   - Relations defined in `/src/db/relations.ts` for reference

5. **Slugs vs IDs:**
   - Using meaningful slugs (`categorySlug`, `brandSlug`) instead of UUIDs
   - Warehouse still uses `id` field as slug (to be migrated)

---

## Best Practices

1. **Locale Handling:**
   - Always validate locale against `['pl', 'en', 'ua', 'es']`
   - Provide fallback to 'en' or first available locale
   - Return localized data in response

2. **Caching:**
   - Public endpoints use aggressive caching
   - Example: `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=300`

3. **Authentication:**
   - Check session using `auth.api.getSession({ headers: await headers() })`
   - Verify admin role for protected endpoints
   - Return 401 for missing auth, 403 for insufficient permissions

4. **Error Handling:**
   - Always wrap in try-catch
   - Log errors with `console.error()`
   - Return meaningful error messages
   - Use appropriate HTTP status codes
