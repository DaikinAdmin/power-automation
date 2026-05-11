'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ItemResponse } from '@/helpers/types/api-responses';
import type { Category } from '@/hooks/useCategories';

interface CatalogDataContextType {
  categories: Category[];
  isCategoriesLoading: boolean;
  items: ItemResponse[];
  isItemsLoading: boolean;
}

const CatalogDataContext = createContext<CatalogDataContextType | undefined>(undefined);

export function CatalogDataProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsCategoriesLoading(true);
      setIsItemsLoading(true);

      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(`/api/public/categories/${locale}`),
        fetch(`/api/public/items/${locale}`),
      ]);

      if (!cancelled) {
        if (categoriesRes.ok) {
          const data = (await categoriesRes.json()) as any[];
          const mapped: Category[] = data
            .map((cat) => ({
              id: cat.slug,
              name: cat.name,
              slug: cat.slug,
              image: cat.imageLink || '/imgs/placeholder-category.svg',
              subcategories:
                cat.subCategories?.map((sub: any) => ({
                  name: sub.name,
                  slug: sub.slug,
                })) ?? [],
            }))
            .sort((a, b) => a.name.localeCompare(b.name, locale));
          setCategories(mapped);
        }
        setIsCategoriesLoading(false);

        if (itemsRes.ok) {
          const data = (await itemsRes.json()) as ItemResponse[];
          setItems(data);
        }
        setIsItemsLoading(false);
      }
    }

    fetchAll().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <CatalogDataContext.Provider
      value={{ categories, isCategoriesLoading, items, isItemsLoading }}
    >
      {children}
    </CatalogDataContext.Provider>
  );
}

export function useCatalogData(): CatalogDataContextType {
  const ctx = useContext(CatalogDataContext);
  if (!ctx) {
    throw new Error('useCatalogData must be used inside <CatalogDataProvider>');
  }
  return ctx;
}
