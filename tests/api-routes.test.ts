import type { NextRequest } from 'next/server';

const mockDb = {
  category: { findMany: jest.fn() },
  item: { findMany: jest.fn() },
  user: { findUnique: jest.fn() },
  currencyExchange: { findMany: jest.fn(), upsert: jest.fn() },
  warehouse: { findMany: jest.fn() },
  brand: { findMany: jest.fn() },
};

const mockGetSession = jest.fn();
const mockHeaders = jest.fn();

jest.mock('@/db', () => ({
  __esModule: true,
  default: mockDb,
}));

jest.mock('@/lib/auth', () => ({
  __esModule: true,
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: mockHeaders,
}));

import { GET as getPublicCategories } from '@/app/api/public/categories/[locale]/route';
import { GET as getPublicItems } from '@/app/api/public/items/[locale]/route';
import { GET as getCurrencyExchange } from '@/app/api/admin/currency-exchange/route';
import { GET as getWarehouses } from '@/app/api/admin/warehouses/route';
import { GET as getBrands } from '@/app/api/admin/brands/route';

const buildParams = <T>(params: T) => ({ params: Promise.resolve(params) });

describe('API route handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
  });

  describe('public categories GET', () => {
    it('returns 400 for invalid locale', async () => {
      const response = await getPublicCategories({} as NextRequest, buildParams({ locale: 'it' }));
      expect(response.status).toBe(400);
      expect(mockDb.category.findMany).not.toHaveBeenCalled();
    });

    it('returns data with caching headers for valid locale', async () => {
      const categories = [{ id: '1', name: 'Category', subCategories: [] }];
    mockDb.category.findMany.mockResolvedValue(categories);

      const response = await getPublicCategories({} as NextRequest, buildParams({ locale: 'pl' }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(categories);
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    });
  });

  describe('public items GET', () => {
    it('returns data with caching headers for valid locale', async () => {
      const items = [{ id: '1', articleId: 'A1' }];
      mockDb.item.findMany.mockResolvedValue(items);

      const response = await getPublicItems({} as NextRequest, buildParams({ locale: 'pl' }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(items);
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    });
  });

  describe('admin currency exchange GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await getCurrencyExchange();
      expect(response.status).toBe(401);
      expect(mockDb.currencyExchange.findMany).not.toHaveBeenCalled();
    });

    it('returns data with caching headers when admin', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'admin-id' } });
      mockDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      const rates = [{ id: '1', from: 'PLN', to: 'EUR', rate: 4.5 }];
      mockDb.currencyExchange.findMany.mockResolvedValue(rates);

      const response = await getCurrencyExchange();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(rates);
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    });
  });

  describe('admin warehouses GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await getWarehouses();
      expect(response.status).toBe(401);
      expect(mockDb.warehouse.findMany).not.toHaveBeenCalled();
    });

    it('returns data with caching headers when session exists', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'user-id' } });
      const warehouses = [{ id: 'w1', name: 'W1' }];
      mockDb.warehouse.findMany.mockResolvedValue(warehouses);

      const response = await getWarehouses();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(warehouses);
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    });
  });

  describe('admin brands GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await getBrands();
      expect(response.status).toBe(401);
      expect(mockDb.brand.findMany).not.toHaveBeenCalled();
    });

    it('returns data with caching headers when admin', async () => {
      mockGetSession.mockResolvedValue({ user: { id: 'admin-id' } });
      mockDb.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      const brands = [{ id: 'b1', name: 'Brand', alias: 'brand', imageLink: '', isVisible: true, _count: { items: 0 } }];
      mockDb.brand.findMany.mockResolvedValue(brands);

      const response = await getBrands();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(brands);
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400');
    });
  });
});
