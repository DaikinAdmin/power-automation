import CategoriesPage from '@/components/layout/categories-page'
import { Suspense, use } from 'react'


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