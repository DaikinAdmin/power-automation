import { useCatalogData } from '@/components/catalog-data-context';

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: { name: string; slug: string }[];
};

export function useCategories(_locale: string) {
  const { categories, isCategoriesLoading } = useCatalogData();
  return { categories, isLoading: isCategoriesLoading, error: null, refetch: async () => {} };
}
