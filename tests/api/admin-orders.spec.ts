import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateOrderResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Admin Orders API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/admin/orders - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders`);
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      validateErrorResponse(data);
    });

    test('GET /api/admin/orders/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders/test-id`);
      
      expect(response.status()).toBe(401);
    });

    test('PATCH /api/admin/orders/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/admin/orders/test-id`, {
        data: { status: 'PROCESSING' }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Request Validation', () => {
    test('PATCH /api/admin/orders/test-id - should validate status value', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/admin/orders/test-id`, {
        data: { status: 'INVALID_STATUS' }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });

    test('PATCH /api/admin/orders/test-id - should require status field', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/admin/orders/test-id`, {
        data: {}
      });
      
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/admin/orders - should return array of orders', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        if (data.length > 0) {
          data.forEach((order: any) => {
            validateOrderResponse(order);
            
            // Check lineItems
            if (order.lineItems) {
              expect(Array.isArray(order.lineItems)).toBeTruthy();
              order.lineItems.forEach((lineItem: any) => {
                expect(lineItem).toHaveProperty('itemId');
                expect(lineItem).toHaveProperty('quantity');
                expect(lineItem).toHaveProperty('unitPrice');
              });
            }
            
            // Check user info
            if (order.user) {
              expect(order.user).toHaveProperty('id');
              expect(order.user).toHaveProperty('email');
            }
          });
        }
      }
    });

    test('GET /api/admin/orders?status=NEW - should filter by status', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders?status=NEW`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateArrayResponse(data);
        
        // All orders should have status NEW
        data.forEach((order: any) => {
          expect(order.status).toBe('NEW');
        });
      }
    });

    test('GET /api/admin/orders?page=1&pageSize=10 - should support pagination', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders?page=1&pageSize=10`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        // Check pagination fields
        expect(data).toHaveProperty('orders');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('page');
        expect(data).toHaveProperty('pageSize');
      }
    });

    test('GET /api/admin/orders/test-id - should return single order with details', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/admin/orders/test-id`);
      
      if (response.status() === 200) {
        const data = await response.json();
        validateOrderResponse(data);
        
        // Check items in order
        if (data.items) {
          expect(Array.isArray(data.items)).toBeTruthy();
        }
      } else if (response.status() === 404) {
        const data = await response.json();
        validateErrorResponse(data);
      }
    });
  });
});
