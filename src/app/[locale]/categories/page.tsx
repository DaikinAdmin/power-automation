import CategoriesPage from '@/components/layout/categories-page'
import { Suspense, use } from 'react'
export { generateCategoriesMetadata as generateMetadata } from "@/lib/seo-metadata";

export const dynamic = 'force-dynamic';

export default function CategoryPage ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
    const { locale } = use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage locale={locale} />
    </Suspense>
  )
}