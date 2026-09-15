import { test, expect, APIRequestContext } from '@playwright/test';
import { validateResponse, validateArrayResponse } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Canonical hosts from src/lib/domain-config.ts — sent as an explicit Host
// header override so a single dev server can be exercised as either domain.
// (Route handlers resolve the domain via request.headers.get('host'), not
// x-forwarded-host — see getDomainKeyByHost callers.)
const DOMAIN_HOSTS = {
  ua: 'powerautomation.com.ua',
  pl: 'powerautomation.pl',
} as const;

async function getVisibleWarehouseIds(request: APIRequestContext, host: string): Promise<Set<string>> {
  const response = await request.get(`${BASE_URL}/api/public/warehouses/visible`, {
    headers: { Host: host },
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data.warehouseIds)).toBeTruthy();
  return new Set<string>(data.warehouseIds);
}

test.describe('Warehouse cross-domain visibility', () => {

  test.describe('GET /api/public/warehouses/visible', () => {
    test('returns a well-formed warehouse id list', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/warehouses/visible`);

      validateResponse(response, 200);
      const data = await response.json();

      expect(data).toHaveProperty('warehouseIds');
      expect(Array.isArray(data.warehouseIds)).toBeTruthy();
      data.warehouseIds.forEach((id: any) => expect(typeof id).toBe('string'));
    });

    test('carries Vary: Host — response depends on the requesting domain', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/warehouses/visible`);

      expect(response.status()).toBe(200);
      expect(response.headers()['vary']).toContain('Host');
    });

    (Object.keys(DOMAIN_HOSTS) as Array<keyof typeof DOMAIN_HOSTS>).forEach((domain) => {
      test(`resolves for the ${domain} domain via Host header`, async ({ request }) => {
        // Dev data may have zero, one, or many warehouses visible for this
        // domain — this only asserts the endpoint resolves without error.
        await getVisibleWarehouseIds(request, DOMAIN_HOSTS[domain]);
      });
    });
  });

  // The core regression check: nothing served under one domain's Host header
  // may reference a warehouse that domain doesn't have in its visible set —
  // that would mean one site is leaking another site's stock/pricing.
  test.describe('Cross-domain isolation', () => {
    (Object.keys(DOMAIN_HOSTS) as Array<keyof typeof DOMAIN_HOSTS>).forEach((domain) => {
      const host = DOMAIN_HOSTS[domain];

      test(`/api/public/items/pl only references warehouses visible on ${domain} when requested as ${domain}`, async ({ request }) => {
        const [itemsRes, visibleIds] = await Promise.all([
          request.get(`${BASE_URL}/api/public/items/pl`, { headers: { Host: host } }),
          getVisibleWarehouseIds(request, host),
        ]);

        validateResponse(itemsRes, 200);
        const items = await itemsRes.json();
        validateArrayResponse(items);

        const seenWarehouseIds = new Set<string>();
        items.forEach((item: any) => {
          (item.prices || []).forEach((price: any) => {
            if (price.warehouse?.slug) seenWarehouseIds.add(price.warehouse.slug);
          });
        });

        seenWarehouseIds.forEach((id) => {
          expect(visibleIds.has(id)).toBeTruthy();
        });
      });

      test(`/api/search only references warehouses visible on ${domain} when requested as ${domain}`, async ({ request }) => {
        const [searchRes, visibleIds] = await Promise.all([
          request.get(`${BASE_URL}/api/search?q=a`, { headers: { Host: host } }),
          getVisibleWarehouseIds(request, host),
        ]);

        expect(searchRes.status()).toBe(200);
        // GET /api/search returns a bare array (see src/app/api/search/route.ts), not { items: [...] }
        const results = await searchRes.json();
        validateArrayResponse(results);

        const seenWarehouseIds = new Set<string>();
        results.forEach((item: any) => {
          (item.itemPrice || []).forEach((price: any) => {
            if (price.warehouse?.id) seenWarehouseIds.add(price.warehouse.id);
          });
        });

        seenWarehouseIds.forEach((id) => {
          expect(visibleIds.has(id)).toBeTruthy();
        });
      });
    });
  });

  // Endpoints whose content now depends on the request's Host must not be
  // shared across domains by a downstream/CDN cache without a Vary key.
  test.describe('Cache correctness (Vary: Host)', () => {
    test('GET /api/public/items/pl carries Vary: Host', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/public/items/pl`);

      expect(response.status()).toBe(200);
      expect(response.headers()['vary']).toContain('Host');
    });

    test('GET /api/public/category/pl/<slug> carries Vary: Host', async ({ request }) => {
      // The route returns 200 with an empty items array for an unknown slug
      // (it filters an already-fetched item list), so no real category is needed.
      const response = await request.get(`${BASE_URL}/api/public/category/pl/non-existent-category-slug-12345`);

      expect(response.status()).toBe(200);
      expect(response.headers()['vary']).toContain('Host');
    });

    test('GET /feed/products.xml carries Vary: Host', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/feed/products.xml`);

      expect(response.status()).toBe(200);
      expect(response.headers()['vary']).toContain('Host');
    });
  });

  // Server-side order validation must reject a hidden/foreign warehouseId
  // even when the client-side filtering is bypassed entirely.
  test.describe('Order creation rejects hidden warehouses', () => {
    test('POST /api/orders (price request) - fabricated warehouseId does not silently succeed', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/orders`, {
        data: {
          isPriceRequest: true,
          itemId: 'test-item-id',
          warehouseId: 'definitely-not-a-real-warehouse-id',
          quantity: 1,
          price: 100,
          status: 'ON_DEMAND',
        },
      });

      // Unauthenticated requests are rejected before the warehouse check runs
      // (401); an authenticated request would hit isWarehouseVisibleOnDomain
      // and get 404 "Item not available in selected warehouse". Either way
      // it must never be 200/201.
      expect([401, 404]).toContain(response.status());
    });
  });
});
