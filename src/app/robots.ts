import { MetadataRoute } from "next";
import { getBaseUrl, getIndexedLocales } from "@/lib/domain-config";

/**
 * Dynamic robots.txt — generated per-domain based on env vars.
 * Allows only the locales configured for this domain to be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const indexedLocales = getIndexedLocales();

  // All known locales in the app
  const ALL_LOCALES = ["pl", "en", "es", "ua"];

  // Build disallow list: admin, api, dashboard + non-indexed locales
  const disallow = ["/admin/", "/api/", "/dashboard/"];
  for (const locale of ALL_LOCALES) {
    if (!indexedLocales.includes(locale)) {
      disallow.push(`/${locale}/`);
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/feed/products.xml"],
        disallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
