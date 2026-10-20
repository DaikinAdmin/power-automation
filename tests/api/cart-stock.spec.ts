import { test, expect, APIRequestContext } from '@playwright/test';
import { validateResponse, validateArrayResponse } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Canonical hosts from src/lib/domain-config.ts — see warehouse-visibility.spec.ts.
const DOMAIN_HOSTS = {
  ua: 'powerautomation.com.ua',
  pl: 'powerautomation.pl',
} as const;

const STOCK_URL = `${BASE_URL}/api/public/cart/stock`;

async function getVisibleWarehouseIds(request: APIRequestContext, host: string): Promise<Set<string>> {
  const response = await request.get(`${BASE_URL}/api/public/warehouses/visible`, {
    headers: { Host: host },
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  return new Set<string>(data.warehouseIds);
}

test.describe('POST /api/public/cart/stock', () => {
  test('returns an empty map for an empty cart and is never cached', async ({ request }) => {
    const response = await request.post(STOCK_URL, { data: { articleIds: [] } });

    validateResponse(response, 200);
    expect(await response.json()).toEqual({ items: {} });
    expect(response.headers()['cache-control']).toContain('no-store');
  });

  test('tolerates a malformed body', async ({ request }) => {
    const response = await request.post(STOCK_URL, { data: { articleIds: 'not-an-array' } });

    validateResponse(response, 200);
    expect(await response.json()).toEqual({ items: {} });
  });

  test('omits unknown articles', async ({ request }) => {
    const response = await request.post(STOCK_URL, {
      data: { articleIds: ['definitely-not-a-real-article-id-12345'] },
    });

    validateResponse(response, 200);
    expect(await response.json()).toEqual({ items: {} });
  });

  // The cart drops articles missing from the response, so an oversized
  // request must fail loudly instead of being truncated.
  test('rejects more than 100 articles instead of truncating', async ({ request }) => {
    const articleIds = Array.from({ length: 101 }, (_, i) => `article-${i}`);
    const response = await request.post(STOCK_URL, { data: { articleIds } });

    expect(response.status()).toBe(400);
  });

  (Object.keys(DOMAIN_HOSTS) as Array<keyof typeof DOMAIN_HOSTS>).forEach((domain) => {
    const host = DOMAIN_HOSTS[domain];

    test(`returns well-formed stock limited to warehouses visible on ${domain}`, async ({ request }) => {
      const [itemsRes, visibleIds] = await Promise.all([
        request.get(`${BASE_URL}/api/public/items/pl`, { headers: { Host: host } }),
        getVisibleWarehouseIds(request, host),
      ]);
      validateResponse(itemsRes, 200);
      const catalog = await itemsRes.json();
      validateArrayResponse(catalog);

      const articleIds: string[] = catalog.slice(0, 10).map((item: any) => item.articleId);
      test.skip(articleIds.length === 0, `no items on ${domain} in this dataset`);

      const response = await request.post(STOCK_URL, {
        headers: { Host: host },
        data: { articleIds },
      });
      validateResponse(response, 200);
      const { items } = await response.json();

      Object.entries(items).forEach(([articleId, warehouses]) => {
        expect(articleIds).toContain(articleId);
        (warehouses as any[]).forEach((warehouse) => {
          expect(visibleIds.has(warehouse.warehouseId)).toBeTruthy();
          expect(typeof warehouse.price).toBe('number');
          expect(warehouse.basePrice).toBe(warehouse.price);
          expect(Number.isInteger(warehouse.quantity)).toBeTruthy();
          expect(warehouse.inStock).toBe(warehouse.quantity > 0);
        });
      });
    });
  });
});
