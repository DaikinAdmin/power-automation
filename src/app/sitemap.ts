import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getDomainConfigByHost } from '@/lib/domain-config';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

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

/** Fetch category slugs directly from the database */
async function fetchCategories(): Promise<{ slug: string }[]> {
  try {
    return await db
      .select({ slug: schema.category.slug })
      .from(schema.category);
  } catch (e) {
    console.error('Sitemap: failed to fetch categories', e);
    return [];
  }
}

/** Fetch displayed item slugs directly from the database */
async function fetchItems(): Promise<{ slug: string }[]> {
  try {
    return await db
      .select({ slug: schema.item.slug })
      .from(schema.item)
      .where(eq(schema.item.isDisplayed, true));
  } catch (e) {
    console.error('Sitemap: failed to fetch items', e);
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
  const categories = await fetchCategories();
  for (const locale of LOCALES) {
    for (const cat of categories) {
      if (cat.slug) {
        entries.push({
          url: `${BASE_URL}/${locale}/category/${cat.slug}`,
          lastModified: now,
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  }

  // Dynamic products
  const items = await fetchItems();
  for (const locale of LOCALES) {
    for (const item of items) {
      if (item.slug) {
        entries.push({
          url: `${BASE_URL}/${locale}/product/${item.slug}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
