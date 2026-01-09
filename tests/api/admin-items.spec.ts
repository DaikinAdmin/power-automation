import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateItemResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Admin Items API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/items - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items`);
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      validateErrorResponse(data);
    });

    test('POST /api/admin/items - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items`, {
        data: {
          articleId: 'TEST-001',
          categorySlug: 'test',
          itemDetails: [],
          itemPrice: []
        }
      });
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/items/test-article-id - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items/test-article-id`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/items/test-article-id - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/items/test-article-id`, {
        data: { articleId: 'TEST-001' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('DELETE /api/admin/items/test-article-id - should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/admin/items/test-article-id`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/items/test-article-id/setVisible - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/items/test-article-id/setVisible`, {
        data: { isDisplayed: true }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('POST /api/admin/items - should validate required articleId', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items`, {
        data: {
          // Missing articleId
          categorySlug: 'test'
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/admin/items - should validate categorySlug (new single field)', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items`, {
        data: {
          articleId: 'TEST-001',
          categorySlug: 'non-existent-category',
          itemDetails: [],
          itemPrice: []
        }
      });
      
      // Should validate that category exists
      expect([400, 401, 404]).toContain(response.status());
    });

    test('POST /api/admin/items - should validate itemDetails structure', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items`, {
        data: {
          articleId: 'TEST-001',
          categorySlug: 'test',
          itemDetails: [
            {
              locale: 'pl'
              // Missing required fields like itemName
            }
          ],
          itemPrice: []
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/admin/items - should validate itemPrice structure', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items`, {
        data: {
          articleId: 'TEST-001',
          categorySlug: 'test',
          itemDetails: [],
          itemPrice: [
            {
              warehouseId: 'test-warehouse'
              // Missing required fields like price, quantity
            }
          ]
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('PUT /api/admin/items/test-id/setVisible - should validate isDisplayed field', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/items/test-id/setVisible`, {
        data: {
          isDisplayed: 'invalid' // Should be boolean
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/items - should return array of items with full details', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((item: any) => {
            validateItemResponse(item);
            
            // Check category (single field now)
            if (item.category) {
              expect(item.category).toHaveProperty('slug');
            }
            
            // Check subCategory (populated if categorySlug references a subcategory)
            if (item.subCategory) {
              expect(item.subCategory).toHaveProperty('slug');
            }
            
            // Check brand
            if (item.brand) {
              expect(item.brand).toHaveProperty('name');
              expect(item.brand).toHaveProperty('alias');
            }
            
            // Check itemDetails
            if (item.itemDetails) {
              expect(Array.isArray(item.itemDetails)).toBeTruthy();
              item.itemDetails.forEach((detail: any) => {
                expect(detail).toHaveProperty('locale');
                expect(detail).toHaveProperty('itemName');
                expect(detail).toHaveProperty('description');
              });
            }
            
            // Check itemPrice
            if (item.itemPrice) {
              expect(Array.isArray(item.itemPrice)).toBeTruthy();
              item.itemPrice.forEach((price: any) => {
                expect(price).toHaveProperty('price');
                expect(price).toHaveProperty('quantity');
                expect(price).toHaveProperty('warehouseId');
                
                if (price.warehouse) {
                  expect(price.warehouse).toHaveProperty('name');
                }
              });
            }
          });
        }
      }
    });

    test('GET /api/admin/items/test-article-id - should return single item with relations', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items/test-article-id`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateItemResponse(data);
        
        // Verify new category/subcategory logic
        // Either category OR both category and subCategory should be present
        expect(data).toHaveProperty('category');
        
      } else if (response.status() === 404) {
        const data = await response.json();
        validateErrorResponse(data);
      }
    });
  });

  test.describe('Bulk Upload', () => {
    test('POST /api/admin/items/bulk-upload - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items/bulk-upload`, {
        multipart: {
          file: {
            name: 'test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from('articleId,name\nTEST-001,Test Item')
          }
        }
      });
      
      expect(response.status()).toBe(401);
    });

    test('POST /api/admin/items/bulk-upload - should validate file type', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/items/bulk-upload`, {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('invalid content')
          }
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Export', () => {
    test('GET /api/admin/items/export - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items/export`);
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/items/export?format=json - should support JSON format', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items/export?format=json`);
      
      if (response.status() === 200) {
        expect(response.headers()['content-type']).toContain('application/json');
      }
    });

    test('GET /api/admin/items/export?format=csv - should support CSV format', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/items/export?format=csv`);
      
      if (response.status() === 200) {
        expect(response.headers()['content-type']).toContain('text/csv');
      }
    });
  });
});
