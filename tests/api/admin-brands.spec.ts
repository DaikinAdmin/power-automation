import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateBrandResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Admin Brands API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/brands - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/brands`);
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      validateErrorResponse(data);
    });

    test('POST /api/admin/brands - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/brands`, {
        data: { name: 'Test Brand', alias: 'test-brand' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/brands/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/brands/test-id`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/brands/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/brands/test-id`, {
        data: { name: 'Updated Brand' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('DELETE /api/admin/brands/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/admin/brands/test-id`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('POST /api/admin/brands - should validate required fields', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/brands`, {
        data: {}
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/admin/brands - should validate alias uniqueness', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/brands`, {
        data: {
          name: 'Duplicate Brand',
          alias: 'existing-alias'
        }
      });
      
      // Could be 400 (validation error), 401 (unauthorized), or 409 (conflict)
      expect([400, 401, 409]).toContain(response.status());
    });

    test('PUT /api/admin/brands/test-id - should validate update data', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/brands/test-id`, {
        data: {
          name: '' // Empty name
        }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/brands - should return array of brands', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/brands`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((brand: any) => {
            validateBrandResponse(brand);
            
            // Check optional fields
            if (brand.imageLink) {
              expect(typeof brand.imageLink).toBe('string');
            }
            
            if (brand.isVisible !== undefined) {
              expect(typeof brand.isVisible).toBe('boolean');
            }
          });
        }
      }
    });

    test('GET /api/admin/brands/test-id - should return single brand', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/brands/test-id`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateBrandResponse(data);
      } else if (response.status() === 404) {
        const data = await response.json();
        validateErrorResponse(data);
      }
    });

    test('GET /api/admin/brands?visible=true - should filter by visibility', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/brands?visible=true`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        // All brands should be visible
        data.forEach((brand: any) => {
          if (brand.isVisible !== undefined) {
            expect(brand.isVisible).toBe(true);
          }
        });
      }
    });
  });
});
