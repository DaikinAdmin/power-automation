import CategoriesPage from '@/components/layout/categories-page'
import React, { Suspense } from 'react'

const CategoryPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage />
    </Suspense>
  )
}

export default CategoryPage