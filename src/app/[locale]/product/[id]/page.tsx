import ProductPageClient from "@/components/product/product-page-client";
export { generateProductMetadata as generateMetadata } from "@/lib/seo-metadata";

export default function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return <ProductPageClient params={params} />;
}