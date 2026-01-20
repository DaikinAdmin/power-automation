import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateItemResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOCALES = ['pl', 'en', 'ua', 'es'];

test.describe('Public Items API', () => {
  
  LOCALES.forEach((locale) => {
    test(`GET /api/public/items/${locale} - should return items for ${locale}`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/${locale}`);
      
      validateResponse(response, 200);
      const data = await response.json();
      
      // Validate items array
      expect(data).toHaveProperty('items');
      validateArrayResponse(data.items);
      
      // Validate pagination
      expect(data).toHaveProperty('total');
      expect(typeof data.total).toBe('number');
      
      // Validate each item
      if (data.items.length > 0) {
        data.items.forEach((item: any) => {
          validateItemResponse(item);
          
          // Check locale-specific fields
          expect(item).toHaveProperty('itemName');
          expect(typeof item.itemName).toBe('string');
          
          // Check category
          if (item.category) {
            expect(item.category).toHaveProperty('name');
            expect(item.category).toHaveProperty('slug');
          }
          
          // Check prices
          if (item.prices && item.prices.length > 0) {
            item.prices.forEach((price: any) => {
              expect(price).toHaveProperty('price');
              expect(price).toHaveProperty('quantity');
              expect(typeof price.price).toBe('number');
              expect(typeof price.quantity).toBe('number');
            });
          }
        });
      }
    });

    test(`GET /api/public/items/${locale}?page=1&pageSize=10 - should support pagination`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/${locale}?page=1&pageSize=10`);
      
      validateResponse(response, 200);
      const data = await response.json();
      
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('pageSize');
      
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(10);
      expect(data.items.length).toBeLessThanOrEqual(10);
    });

    test(`GET /api/public/items/${locale}?categorySlug=test - should filter by category`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/${locale}?categorySlug=test`);
      
      validateResponse(response, 200);
      const data = await response.json();
      
      expect(data).toHaveProperty('items');
      validateArrayResponse(data.items);
    });

    test(`GET /api/public/items/${locale}?brandSlug=test - should filter by brand`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/${locale}?brandSlug=test`);
      
      validateResponse(response, 200);
      const data = await response.json();
      
      expect(data).toHaveProperty('items');
    });

    test(`GET /api/public/items/${locale}?minPrice=100&maxPrice=500 - should filter by price range`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/${locale}?minPrice=100&maxPrice=500`);
      
      validateResponse(response, 200);
      const data = await response.json();
      
      expect(data).toHaveProperty('items');
    });
  });

  test('GET /api/public/items/pl/test-slug - should return single item by slug', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/public/items/pl/test-slug`);
    
    // Either 200 with item or 404 if not found
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      validateItemResponse(data);
      
      expect(data).toHaveProperty('articleId');
      expect(data).toHaveProperty('itemName');
      expect(data).toHaveProperty('description');
    } else {
      const data = await response.json();
      validateErrorResponse(data);
    }
  });

  test('GET /api/public/items/pl/non-existent-slug - should return 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/public/items/pl/non-existent-slug-12345`);
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    validateErrorResponse(data);
  });
});
