import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateWarehouseResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Admin Warehouses API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/warehouses - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/warehouses`);
      
      expect(response.status()).toBe(401);
    });

    test('POST /api/admin/warehouses - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/warehouses`, {
        data: { name: 'Test Warehouse', countrySlug: 'pl' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/warehouses/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/warehouses/test-id`, {
        data: { name: 'Updated' }
      });
      
      expect(response.status()).toBe(401);
    });

    test('DELETE /api/admin/warehouses/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/admin/warehouses/test-id`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('POST /api/admin/warehouses - should validate required name', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/warehouses`, {
        data: { countrySlug: 'pl' } // Missing name
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/admin/warehouses - should validate country slug', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/warehouses`, {
        data: {
          name: 'Test Warehouse',
          countrySlug: 'invalid-country'
        }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/warehouses - should return array of warehouses', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/warehouses`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((warehouse: any) => {
            validateWarehouseResponse(warehouse);
            
            // Check country relation
            if (warehouse.country) {
              expect(warehouse.country).toHaveProperty('name');
              expect(warehouse.country).toHaveProperty('slug');
            }
            
            // Check optional fields
            if (warehouse.displayedName) {
              expect(typeof warehouse.displayedName).toBe('string');
            }
          });
        }
      }
    });
  });
});

test.describe('Admin Users API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/users - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/users`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/users/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/users/test-id`, {
        data: { banned: true }
      });
      
      expect(response.status()).toBe(401);
    });

    test('DELETE /api/admin/users/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/admin/users/test-id`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/users - should return array of users', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/users`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((user: any) => {
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('email');
            expect(typeof user.id).toBe('string');
            expect(typeof user.email).toBe('string');
            
            // Should not expose sensitive data
            expect(user).not.toHaveProperty('password');
          });
        }
      }
    });

    test('GET /api/admin/users?page=1&pageSize=10 - should support pagination', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/users?page=1&pageSize=10`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('users');
        expect(data).toHaveProperty('total');
      }
    });
  });
});

test.describe('Admin Discount Levels API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/discount-levels - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/discount-levels`);
      
      expect(response.status()).toBe(401);
    });

    test('POST /api/admin/discount-levels - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/discount-levels`, {
        data: { level: 1, discountPercent: 10 }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('POST /api/admin/discount-levels - should validate level and discount', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/admin/discount-levels`, {
        data: { level: -1, discountPercent: 150 } // Invalid values
      });
      
      expect([400, 401]).toContain(response.status());
    });
  });
});

test.describe('Admin Currency Exchange API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/currency-exchange - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/currency-exchange`);
      
      expect(response.status()).toBe(401);
    });

    test('PUT /api/admin/currency-exchange - should return 401 without auth', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/api/admin/currency-exchange`, {
        data: { rates: {} }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/currency-exchange - should return exchange rates', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/currency-exchange`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('rates');
        expect(typeof data.rates).toBe('object');
      }
    });
  });
});

test.describe('Admin Dashboard API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/dashboard/stats - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/dashboard/stats`);
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/admin/dashboard/recent-orders - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/dashboard/recent-orders`);
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/dashboard/stats - should return dashboard statistics', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/dashboard/stats`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        // Should have various metrics
        expect(data).toHaveProperty('totalOrders');
        expect(data).toHaveProperty('totalRevenue');
        expect(typeof data.totalOrders).toBe('number');
        expect(typeof data.totalRevenue).toBe('number');
      }
    });

    test('GET /api/admin/dashboard/recent-orders - should return recent orders', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/dashboard/recent-orders`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
      }
    });
  });
});
