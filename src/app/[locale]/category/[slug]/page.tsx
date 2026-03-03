import type { Metadata } from "next";
import PageLayout from "@/components/layout/page-layout";
import { CategoryBreadcrumb } from "@/components/category/category-breadcrumb";
import { CategoryPageClient } from "@/components/category/category-page-client";
import { getCategoryPageData } from "@/helpers/db/category-data-queries";
import { getBaseUrl } from "@/lib/domain-config";

interface CategoryPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { locale, slug } = await params;
  const search = await searchParams;

  // Extract filters from search params
  const subcategoryFilters = Array.isArray(search.subcategory)
    ? search.subcategory
    : search.subcategory
    ? [search.subcategory]
    : [];
  
  const brandFilters = Array.isArray(search.brand)
    ? search.brand
    : search.brand
    ? [search.brand]
    : [];
  
  const warehouseFilters = Array.isArray(search.warehouse)
    ? search.warehouse
    : search.warehouse
    ? [search.warehouse]
    : [];

  // Extract pagination params
  const page = typeof search.page === 'string' ? parseInt(search.page, 10) : 1;
  const limit = typeof search.limit === 'string' ? parseInt(search.limit, 10) : 16;

  // Fetch data on the server
  const categoryData = await getCategoryPageData(
    locale,
    slug,
    {
      subcategory: subcategoryFilters,
      brand: brandFilters,
      warehouse: warehouseFilters,
    },
    {
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(5, limit)),
    }
  );

  const getOriginalCategoryName = () => {
    const currentCategory = categoryData.categories.find((cat) => cat.slug === slug);
    return (
      currentCategory?.name ||
      slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  const categoryName = getOriginalCategoryName();

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        <main className="overflow-x-hidden">
          <div className="max-w-[90rem] w-full mx-auto px-2 sm:px-4 py-4 sm:py-8">
            {/* Breadcrumb */}
            <CategoryBreadcrumb locale={locale} categoryName={categoryName} />

            {/* Client-side interactive components */}
            <CategoryPageClient
              locale={locale}
              categorySlug={slug}
              initialData={categoryData}
              categoryName={categoryName}
            />
          </div>
        </main>
      </div>
    </PageLayout>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const categoryData = await getCategoryPageData(locale, slug, {}, { page: 1, limit: 1 }).catch(() => null);

  const categoryName =
    categoryData?.categories.find((c) => c.slug === slug)?.name ||
    slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const SUFFIX: Record<string, string> = {
    ua: "купити в Україні | Power Automation",
    pl: "kup w Polsce | Power Automation",
    en: "buy online | Power Automation",
    es: "comprar en línea | Power Automation",
  };

  const DESC_TPL: Record<string, (n: string) => string> = {
    ua: (n) => `Купити ${n} в Україні. Широкий вибір, наявність на складі, швидка доставка по Україні.`,
    pl: (n) => `Kup ${n} w Polsce. Szeroki wybór, dostępność na magazynie, szybka dostawa.`,
    en: (n) => `Buy ${n} online. Wide selection, in stock, fast delivery.`,
    es: (n) => `Compra ${n} en línea. Amplia selección, disponibilidad en almacén, entrega rápida.`,
  };

  const suffix = SUFFIX[locale] ?? SUFFIX.ua;
  const descFn = DESC_TPL[locale] ?? DESC_TPL.ua;

  return {
    title: `${categoryName} — ${suffix}`,
    description: descFn(categoryName),
    alternates: {
      canonical: `${getBaseUrl()}/${locale}/category/${slug}`,
    },
    openGraph: {
      title: `${categoryName} — ${suffix}`,
      description: descFn(categoryName),
    },
  };
}
