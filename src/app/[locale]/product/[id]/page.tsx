import type { Metadata } from "next";
import { getItemBySlug } from "@/helpers/db/queries";
import ProductPageClient from "@/components/product/product-page-client";

export async function generateMetadata({
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
  const articleId = item.articleId;
  const category = item.category?.name ?? "";

  const title = [brand, articleId, name].filter(Boolean).join(" ");
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

export default function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return <ProductPageClient params={params} />;
}