import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getDomainConfigByHost } from '@/lib/domain-config';

const STATIC_PAGES = [
  '',
  '/about',
  '/brands',
  '/categories',
  '/contacts',
  '/purchase-delivery',
  '/refunding',
  '/privacy-policy',
];

async function fetchCategories(baseUrl: string, locale: string): Promise<{ slug: string }[]> {
  try {
    const internalUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;
    const res = await fetch(
      `${internalUrl}/api/public/categories/${locale}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.categories ?? [];
  } catch {
    return [];
  }
}

async function fetchItems(baseUrl: string, locale: string): Promise<{ articleId: string }[]> {
  try {
    const internalUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;
    const res = await fetch(
      `${internalUrl}/api/public/items/${locale}?limit=5000`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Динамічний sitemap залежно від домену.
 *
 * powerautomation.com.ua — тільки /ua/ сторінки
 * powerautomation.pl     — тільки /pl/ сторінки
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const domainConfig = getDomainConfigByHost(host);

  const BASE_URL = domainConfig.baseUrl;
  const LOCALES = domainConfig.indexedLocales;
  const DEFAULT_LOCALE = domainConfig.defaultLocale;

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Static pages for indexed locales
  for (const locale of LOCALES) {
    for (const page of STATIC_PAGES) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: now,
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.7,
      });
    }
  }

  // Dynamic categories
  const categories = await fetchCategories(BASE_URL, DEFAULT_LOCALE);
  for (const locale of LOCALES) {
    for (const cat of categories) {
      if (cat.slug) {
        entries.push({
          url: `${BASE_URL}/${locale}/categories/${cat.slug}`,
          lastModified: now,
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  }

  // Dynamic products
  const items = await fetchItems(BASE_URL, DEFAULT_LOCALE);
  for (const locale of LOCALES) {
    for (const item of items) {
      if (item.articleId) {
        entries.push({
          url: `${BASE_URL}/${locale}/product/${item.articleId}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}