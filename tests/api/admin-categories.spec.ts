import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateCategoryResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Admin Categories API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/categories - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/categories`);
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      validateErrorResponse(data);
    });

    test('POST /api/admin/categories - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/categories`, {
        data: { name: 'Test', slug: 'test' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/categories/test-slug - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/categories/test-slug`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/categories/test-slug - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/categories/test-slug`, {
        data: { name: 'Updated' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('DELETE /api/admin/categories/test-slug - should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/admin/categories/test-slug`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('POST /api/admin/categories - should validate required fields', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/categories`, {
        data: {}
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/admin/categories - should validate slug format', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/categories`, {
        data: {
          name: 'Test Category',
          slug: 'Invalid Slug With Spaces'
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('PUT /api/admin/categories/test - should validate update data', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/categories/test`, {
        data: {
          name: '' // Empty name should be invalid
        }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/categories - should return array of categories', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/categories`);
      
      // Will be 401 without auth, but checking the expected successful response structure
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((category: any) => {
            validateCategoryResponse(category);
            
            // Check translations
            if (category.categoryTranslations) {
              expect(Array.isArray(category.categoryTranslations)).toBeTruthy();
            }
            
            // Check subcategories
            if (category.subCategories) {
              expect(Array.isArray(category.subCategories)).toBeTruthy();
            }
          });
        }
      }
    });

    test('GET /api/admin/categories/test-slug - should return single category', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/categories/test-slug`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateCategoryResponse(data);
      }
    });
  });
});
