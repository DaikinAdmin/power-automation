import { type MetadataRoute } from "next";
import { headers } from "next/headers";
import { getDomainConfigByHost, type DomainConfig } from "@/lib/domain-config";

/**
 * Dynamic robots.txt based on the domain.
 *
 * powerautomation.com.ua — indexes only /ua/
 * powerautomation.pl     — indexes only /pl/
 * English (/en/) and Spanish (/es/) are not indexed anywhere.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const domainConfig = getDomainConfigByHost(host);

  // All locales that are NOT indexed on this domain
  const allLocales = ["ua", "pl", "en", "es"];
  const disallowedLocales = allLocales.filter(
    (locale) => !domainConfig.indexedLocales.includes(locale),
  );

  const disallowPaths = [
    "/admin/",
    "/api/",
    "/dashboard/",
    ...disallowedLocales.map((l) => `/${l}/`),
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: domainConfig.indexedLocales.map((l) => `/${l}/`),
        disallow: disallowPaths,
      },
      // Googlebot — allow everything
      {
        userAgent: "Googlebot",
        allow: "/",
      },

      // Googlebot-Image — allow everything
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
    ],
    sitemap: `${domainConfig.baseUrl}/sitemap.xml`,
  };
}
