/**
 * Centralized SEO metadata configuration.
 *
 * All generateMetadata functions live here so titles, descriptions,
 * keywords and templates can be adjusted in one place.
 *
 * Each page re-exports the relevant function as `generateMetadata`:
 *   export { generateProductMetadata as generateMetadata } from "@/lib/seo-metadata";
 */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getItemBySlug } from "@/helpers/db/queries";
import { getCategoryPageData } from "@/helpers/db/category-data-queries";
import { getServerDomainConfig } from "@/lib/server-domain";

// ─────────────────────────────────────────────────────────────────────────────
// Static SEO copy per locale
// Edit here to update titles / descriptions across the site.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE_META: Record<string, { title: string; description: string }> =
  {
    ua: {
      title:
        "Промислова автоматизація: купити обладнання Siemens, Pilz, Schneider Electric — Power Automation",
      description:
        "Інтернет-магазин промислового обладнання. Siemens, Pilz, Atlas Copco та інші бренди. Наявність на складі, швидка доставка по Україні.",
    },
    pl: {
      title: "Power Automation — automatyka przemysłowa",
      description:
        "Sklep internetowy z osprzętem przemysłowym. Siemens, Pilz, Atlas Copco i inne marki. Szybka dostawa.",
    },
    en: {
      title: "Power Automation — Industrial Automation",
      description:
        "Online store for industrial equipment. Siemens, Pilz, Atlas Copco and more. Fast delivery.",
    },
    es: {
      title: "Power Automation — Automatización Industrial",
      description:
        "Tienda online de equipos industriales. Siemens, Pilz, Atlas Copco y más. Entrega rápida.",
    },
  };

export const HOME_META: Record<
  string,
  { title: string; description: string; keywords: string }
> = {
  ua: {
    title:
      "Промислова автоматизація Siemens, Pilz, Schneider Electric | Power Automation",
    description:
      "Інтернет-магазин промислового обладнання в Україні. Siemens, Pilz, Atlas Copco, OMRON та інші бренди. Офіційний постачальник. Наявність на складі в Житомирі, швидка доставка по всій Україні.",
    keywords:
      "промислова автоматизація, промислове обладнання, Siemens Україна, Pilz Україна, Atlas Copco, купити контактор, ПЛК, датчики",
  },
  pl: {
    title:
      "Power Automation — automatyka przemysłowa, Siemens, Pilz, Atlas Copco",
    description:
      "Sklep z osprzętem automatyki przemysłowej. Siemens, Pilz, Atlas Copco, OMRON. Dostawa na terenie całego kraju.",
    keywords:
      "automatyka przemysłowa, osprzęt przemysłowy, Siemens, Pilz, Atlas Copco",
  },
  en: {
    title:
      "Power Automation — Industrial Automation, Siemens, Pilz, Atlas Copco",
    description:
      "Online store for industrial automation equipment. Siemens, Pilz, Atlas Copco, OMRON and more. Fast delivery.",
    keywords:
      "industrial automation, industrial equipment, Siemens, Pilz, Atlas Copco",
  },
  es: {
    title:
      "Power Automation — Automatización Industrial, Siemens, Pilz, Atlas Copco",
    description:
      "Tienda online de automatización industrial. Siemens, Pilz, Atlas Copco, OMRON y más. Entrega rápida.",
    keywords: "automatización industrial, equipos industriales, Siemens, Pilz",
  },
};

export const CATEGORIES_META: Record<
  string,
  { title: string; description: string }
> = {
  ua: {
    title: "Каталог промислового обладнання та автоматики | Power Automation",
    description:
      "Повний каталог комплектуючих для автоматизації: від ПЛК та датчиків до контакторів і приводів. Обладнання Siemens, Pilz, Omron та ін. Наявність на складі та доставка.",
  },
  pl: {
    title: "Wszystkie kategorie | Power Automation",
    description:
      "Katalog osprzętu przemysłowego: styczniki, przekaźniki, czujniki, sterowniki PLC i inne.",
  },
  en: {
    title: "All Categories | Power Automation",
    description:
      "Catalog of industrial equipment: contactors, relays, sensors, PLCs, drives, generators and more.",
  },
  es: {
    title: "Todas las categorías | Power Automation",
    description:
      "Catálogo de equipos industriales: contactores, relés, sensores, PLCs, variadores y más.",
  },
};

// Category page — title suffix and description template per locale
const CATEGORY_SUFFIX: Record<string, string> = {
  ua: "купити в Україні | Power Automation",
  pl: "kup w Polsce | Power Automation",
  en: "buy online | Power Automation",
  es: "comprar en línea | Power Automation",
};

const CATEGORY_DESC_TPL: Record<string, (name: string) => string> = {
  ua: (n) =>
    `Категорія ${n}: купити в Україні. Широкий вибір, наявність на складі, швидка доставка по Україні.`,
  pl: (n) =>
    `Kup ${n} w Polsce. Szeroki wybór, dostępność na magazynie, szybka dostawa.`,
  en: (n) => `Buy ${n} online. Wide selection, in stock, fast delivery.`,
  es: (n) =>
    `Compra ${n} en línea. Amplia selección, disponibilidad en almacén, entrega rápida.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPageContent(locale: string, slug: string) {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/public/pages/${locale}/${slug}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateMetadata functions
// ─────────────────────────────────────────────────────────────────────────────

/** layout.tsx — wraps every locale page, sets title template + robots */
export async function generateLayoutMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const domainConfig = await getServerDomainConfig();
  const meta = SITE_META[locale] ?? SITE_META.ua;
  const isIndexed = domainConfig.indexedLocales.includes(locale);
  return {
    title: {
      default: meta.title,
      template: "%s",
    },
    description: meta.description,
    metadataBase: new URL(domainConfig.baseUrl),
    alternates: {
      canonical: `${domainConfig.baseUrl}/${locale}`,
    },
    openGraph: {
      siteName: domainConfig.siteName,
      locale: locale === "ua" ? "uk_UA" : locale,
      type: "website",
    },
    robots: isIndexed ? "index, follow" : "noindex, nofollow",
  };
}

/** Home page — / */
export async function generateHomeMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = HOME_META[locale] ?? HOME_META.ua;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://powerautomation.com.ua/${locale}`,
      images: ["/imgs/Logo.webp"],
    },
  };
}

/** /categories */
export async function generateCategoriesMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = CATEGORIES_META[locale] ?? CATEGORIES_META.ua;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}/categories`,
    },
  };
}

/** /category/[slug] */
export async function generateCategoryMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const categoryData = await getCategoryPageData(
    locale,
    slug,
    {},
    { page: 1, limit: 1 },
  ).catch(() => null);

  const categoryName =
    categoryData?.categories.find(
      (c: { slug: string; name: string }) => c.slug === slug,
    )?.name ||
    slug
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const suffix = CATEGORY_SUFFIX[locale] ?? CATEGORY_SUFFIX.ua;
  const descFn = CATEGORY_DESC_TPL[locale] ?? CATEGORY_DESC_TPL.ua;

  return {
    title: `${categoryName} — ${suffix}`,
    description: descFn(categoryName),
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}/category/${slug}`,
    },
    openGraph: {
      title: `${categoryName} — ${suffix}`,
      description: descFn(categoryName),
    },
  };
}

/** /product/[id] */
export async function generateProductMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const item = await getItemBySlug(id, locale).catch(() => null);

  if (!item) {
    return { title: "Товар не знайдено" };
  }

  const detail = item.details;
  const name = detail.itemName;
  const brand = item.brand?.name ?? "";
  const category = item.category?.name ?? "";

  const title = [brand, name].filter(Boolean).join(" ");
  const description =
    detail.metaDescription ||
    (name && category
      ? `${name}. ${category}. Купити в Україні за найкращою ціною на Power Automation.`
      : name);
  const keywords = detail.metaKeyWords ?? undefined;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `https://powerautomation.com.ua/${locale}/product/${id}`,
    },
    openGraph: {
      title,
      description: description ?? undefined,
      images: item.itemImageLink?.[0] ? [item.itemImageLink[0]] : [],
    },
  };
}

/** /[slug] — dynamic CMS pages */
export async function generateDynamicPageMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const page = await fetchPageContent(locale, slug);

  if (!page) {
    return { title: "Page Not Found" };
  }

  return {
    title: page.title,
    description:
      page.content.blocks[0]?.data?.text?.substring(0, 160) || page.title,
  };
}

/** /contacts */
export async function generateContactsMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await fetchPageContent(locale, "contacts");

  if (!page) {
    return { title: "Page Not Found" };
  }

  return {
    title: page.title,
    description:
      page.content.blocks[0]?.data?.text?.substring(0, 160) || page.title,
  };
}

/** /privacy-policy */
export async function generatePrivacyPolicyMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacyPolicy" });
  return { title: t("title") };
}
