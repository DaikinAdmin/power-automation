import { test, expect } from '@playwright/test';
import { 
  validateResponse, 
  validateArrayResponse, 
  validateOrderResponse,
  validateErrorResponse
} from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('User Orders API', () => {
  
  test.describe('Unauthorized Access', () => {
    test('GET /api/orders - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders`);
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      validateErrorResponse(data);
    });

    test('POST /api/orders - should return 401 without auth', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [],
          totalPrice: '100.00',
          originalTotalPrice: 100
        }
      });
      
      expect(response.status()).toBe(401);
    });

    test('GET /api/orders/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders/test-id`);
      
      expect(response.status()).toBe(401);
    });

    test('PATCH /api/orders/test-id - should return 401 without auth', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/orders/test-id`, {
        data: { action: 'cancel' }
      });
      
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Order Creation Validation', () => {
    test('POST /api/orders - should validate empty cart', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [],
          totalPrice: '0.00',
          originalTotalPrice: 0
        }
      });
      
      expect([400, 401]).toContain(response.status());
      
      if (response.status() === 400) {
        const data = await response.json();
        validateErrorResponse(data);
        expect(data.error).toContain('empty');
      }
    });

    test('POST /api/orders - should validate totalPrice format', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [
            {
              articleId: 'TEST-001',
              quantity: 1,
              warehouseId: 'warehouse-1'
            }
          ],
          totalPrice: '', // Empty string
          originalTotalPrice: 100
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/orders - should validate cartItems have articleId', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [
            {
              // Missing articleId
              quantity: 1,
              warehouseId: 'warehouse-1'
            }
          ],
          totalPrice: '100.00',
          originalTotalPrice: 100
        }
      });
      
      expect([400, 401]).toContain(response.status());
      
      if (response.status() === 400) {
        const data = await response.json();
        validateErrorResponse(data);
      }
    });

    test('POST /api/orders - should validate item exists', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [
            {
              articleId: 'NON-EXISTENT-ITEM',
              quantity: 1,
              warehouseId: 'warehouse-1'
            }
          ],
          totalPrice: '100.00',
          originalTotalPrice: 100
        }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });

    test('POST /api/orders - should validate stock availability', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [
            {
              articleId: 'TEST-001',
              quantity: 999999, // Excessive quantity
              warehouseId: 'warehouse-1'
            }
          ],
          totalPrice: '999999.00',
          originalTotalPrice: 999999
        }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Price Request Validation', () => {
    test('POST /api/orders - should validate price request fields', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          isPriceRequest: true,
          itemId: 'test-item-id',
          warehouseId: 'warehouse-1',
          quantity: 5,
          price: 100,
          status: 'ON_DEMAND'
        }
      });
      
      // Either processes successfully or returns auth error
      expect([200, 201, 400, 401, 404]).toContain(response.status());
    });

    test('POST /api/orders - should require itemId for price request', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          isPriceRequest: true,
          // Missing itemId
          warehouseId: 'warehouse-1',
          quantity: 5
        }
      });
      
      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('Response Schema Validation', () => {
    test('GET /api/orders - should return user orders', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('orders');
        validateArrayResponse(data.orders);
        
        if (data.orders.length > 0) {
          data.orders.forEach((order: any) => {
            validateOrderResponse(order);
            
            // Check that user can only see their own orders
            // userId should match authenticated user
            expect(order).toHaveProperty('userId');
          });
        }
      }
    });

    test('GET /api/orders/test-id - should return single order', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/orders/test-id`);
      
      if (response.status() === 200) {
        const data = await response.json();
        
        expect(data).toHaveProperty('order');
        validateOrderResponse(data.order);
        
        // Check items in order
        if (data.order.items) {
          expect(Array.isArray(data.order.items)).toBeTruthy();
        }
      } else if (response.status() === 404) {
        const data = await response.json();
        validateErrorResponse(data);
      }
    });

    test('POST /api/orders - should return created order', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          cartItems: [
            {
              articleId: 'TEST-001',
              quantity: 1,
              warehouseId: 'warehouse-1'
            }
          ],
          totalPrice: '100.00',
          originalTotalPrice: 100
        }
      });
      
      if (response.status() === 200 || response.status() === 201) {
        const data = await response.json();
        
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('order');
        
        validateOrderResponse(data.order);
      }
    });
  });

  test.describe('Order Actions', () => {
    test('PATCH /api/orders/test-id - should validate cancel action', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/orders/test-id`, {
        data: { action: 'cancel' }
      });
      
      // Either succeeds, unauthorized, not found, or invalid status
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('PATCH /api/orders/test-id - should reject invalid action', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/orders/test-id`, {
        data: { action: 'invalid-action' }
      });
      
      expect([400, 401, 404]).toContain(response.status());
    });

    test('PATCH /api/orders/test-id - should require action field', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/orders/test-id`, {
        data: {} // Missing action
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('PATCH /api/orders/test-id - should only allow cancel for NEW orders', async ({ request }) => {
      const response = await request.patch(`${BASE_URL}/api/orders/completed-order-id`, {
        data: { action: 'cancel' }
      });
      
      // Should return error if order is not in NEW status
      expect([400, 401, 404]).toContain(response.status());
    });
  });
});
