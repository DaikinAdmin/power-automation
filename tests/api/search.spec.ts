import { test, expect } from '@playwright/test';
import { validateResponse, validateArrayResponse, validateItemResponse } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Search API', () => {
  
  test('GET /api/search?q=test - should return search results', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search?q=test`);
    
    validateResponse(response, 200);
    const data = await response.json();
    
    // Validate response structure
    expect(data).toHaveProperty('items');
    validateArrayResponse(data.items);
    
    // Validate each item has search-relevant fields
    if (data.items.length > 0) {
      data.items.forEach((item: any) => {
        expect(item).toHaveProperty('articleId');
        expect(item).toHaveProperty('itemName');
        expect(typeof item.articleId).toBe('string');
        expect(typeof item.itemName).toBe('string');
      });
    }
  });

  test('GET /api/search?q=test&locale=pl - should return results for specific locale', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search?q=test&locale=pl`);
    
    validateResponse(response, 200);
    const data = await response.json();
    
    expect(data).toHaveProperty('items');
    validateArrayResponse(data.items);
  });

  test('GET /api/search?q=test&limit=5 - should limit results', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search?q=test&limit=5`);
    
    validateResponse(response, 200);
    const data = await response.json();
    
    expect(data).toHaveProperty('items');
    expect(data.items.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/search - should return 400 without query parameter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search`);
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('GET /api/search?q= - should return 400 with empty query', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search?q=`);
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('GET /api/search?q=verylongquerythatdoesnotexistanywhere - should return empty results', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/search?q=verylongquerythatdoesnotexistanywhere12345`);
    
    validateResponse(response, 200);
    const data = await response.json();
    
    expect(data).toHaveProperty('items');
    expect(data.items).toHaveLength(0);
  });
});
