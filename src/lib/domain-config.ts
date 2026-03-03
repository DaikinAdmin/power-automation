/**
 * Domain-aware configuration.
 *
 * All values come from **runtime** environment variables so that one Docker
 * image can serve multiple domains (one container per domain).
 *
 * Environment variables used (set per container):
 *   NEXT_PUBLIC_APP_URL   – full origin, e.g. https://powerautomation.pl
 *   APP_DEFAULT_LOCALE    – default locale for this domain (pl | ua)
 *   APP_SITE_LOCALES      – comma-separated indexed locales (pl,en,es | ua)
 *   APP_GTM_ID            – Google Tag Manager container id (optional)
 *   APP_BINOTEL_ENABLED   – "true" to show Binotel widgets
 *   APP_SITE_NAME         – human-readable site name
 */

/** Full origin URL, NO trailing slash */
export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

/** Bare domain, e.g. "powerautomation.pl" */
export function getDomain(): string {
  try {
    return new URL(getBaseUrl()).hostname;
  } catch {
    return "localhost";
  }
}

/** Default locale for this domain (used in sitemap / robots / redirect) */
export function getDefaultLocale(): string {
  return process.env.APP_DEFAULT_LOCALE || "pl";
}

/** Locales that should be indexed by search engines on this domain */
export function getIndexedLocales(): string[] {
  const raw = process.env.APP_SITE_LOCALES;
  if (raw) return raw.split(",").map((l) => l.trim()).filter(Boolean);
  return [getDefaultLocale()];
}

/** Google Tag Manager container ID (empty string = disabled) */
export function getGtmId(): string {
  return process.env.APP_GTM_ID || "";
}

/** Whether the Binotel widget should be loaded */
export function isBinotelEnabled(): boolean {
  return process.env.APP_BINOTEL_ENABLED === "true";
}

/** Human-readable site name */
export function getSiteName(): string {
  return process.env.APP_SITE_NAME || "Power Automation";
}
