import { type MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getDomainConfigByHost, type DomainConfig } from '@/lib/domain-config';

/**
 * Динамічний robots.txt залежно від домену.
 *
 * powerautomation.com.ua — індексує тільки /ua/
 * powerautomation.pl     — індексує тільки /pl/
 * Англійську (/en/) та іспанську (/es/) не індексуємо ніде.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host');
  const domainConfig = getDomainConfigByHost(host);

  // Всі локалі, які НЕ індексуються на цьому домені
  const allLocales = ['ua', 'pl', 'en', 'es'];
  const disallowedLocales = allLocales.filter(
    (locale) => !domainConfig.indexedLocales.includes(locale),
  );

  const disallowPaths = [
    '/admin/',
    '/api/',
    '/dashboard/',
    ...disallowedLocales.map((l) => `/${l}/`),
  ];

  return {
    rules: {
      userAgent: '*',
      allow: domainConfig.indexedLocales.map((l) => `/${l}/`),
      disallow: disallowPaths,
    },
    sitemap: `${domainConfig.baseUrl}/sitemap.xml`,
  };
}
