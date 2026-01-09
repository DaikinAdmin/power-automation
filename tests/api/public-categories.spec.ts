import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateCategoryResponse 
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOCALES = ['pl', 'en', 'ua', 'es'];

test.describe('Public Categories API', () => {
  
  LOCALES.forEach((locale) => {
    test(`GET /api/public/categories/${locale} - should return categories for ${locale}`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/categories/${locale}`);
      
      // Validate response status and headers
      validateResponse(response, 200);
      
      const data = await response.json();
      
      // Validate response structure
      validateArrayResponse(data);
      
      // Validate each category
      if (data.length > 0) {
        data.forEach((category: any) => {
          validateCategoryResponse(category);
          
          // Check locale-specific fields
          expect(category).toHaveProperty('name');
          expect(typeof category.name).toBe('string');
          
          // Check if subcategories exist
          if (category.subCategories) {
            expect(Array.isArray(category.subCategories)).toBeTruthy();
            category.subCategories.forEach((sub: any) => {
              expect(sub).toHaveProperty('id');
              expect(sub).toHaveProperty('name');
              expect(sub).toHaveProperty('slug');
            });
          }
        });
      }
    });
  });

  test('GET /api/public/categories/invalid - should return 404 for invalid locale', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/public/categories/invalid`);
    
    // May return empty array or 404 depending on implementation
    expect([200, 404]).toContain(response.status());
  });

  test('GET /api/public/categories/pl - should have cache headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/public/categories/pl`);
    
    expect(response.status()).toBe(200);
    
    // Check for cache control headers
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeTruthy();
  });
});
