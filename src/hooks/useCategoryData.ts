import { useState, useEffect, useCallback } from 'react';
import { ItemResponse } from '@/helpers/types/api-responses';

interface UseCategoryDataParams {
  locale: string;
  categorySlug?: string;
  filters?: {
    brand?: string[];
    warehouse?: string[];
    subcategory?: string[];
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: { id: string; name: string; slug: string }[];
}

interface Brand {
  name: string;
  slug: string;
}

interface Warehouse {
  id: string;
  name: string;
  country: string;
  displayedName: string;
}

interface UseCategoryDataReturn {
  items: ItemResponse[];
  categories: Category[];
  brands: Brand[];
  warehouses: Warehouse[];
  subcategories: { id: string; name: string; slug: string }[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCategoryData({
  locale,
  categorySlug,
  filters,
}: UseCategoryDataParams): UseCategoryDataReturn {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string
      const params = new URLSearchParams();
      filters?.brand?.forEach(b => params.append('brand', b));
      filters?.warehouse?.forEach(w => params.append('warehouse', w));
      filters?.subcategory?.forEach(s => params.append('subcategory', s));
      
      const queryString = params.toString();
      
      // Fetch filtered items (category-specific or all)
      const itemsUrl = categorySlug
        ? `/api/public/category/${locale}/${categorySlug}${queryString ? `?${queryString}` : ''}`
        : `/api/public/items/${locale}${queryString ? `?${queryString}` : ''}`;
      
      const itemsResponse = await fetch(itemsUrl);
      
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        setItems(itemsData);
      }

      // Fetch all items for extracting categories, brands, and warehouses
      const allItemsResponse = await fetch(`/api/public/items/${locale}`);
      
      if (allItemsResponse.ok) {
        const allItems = await allItemsResponse.json() as ItemResponse[];
        
        // Build categories map
        const categoryMap = new Map();
        allItems.forEach((item) => {
          if (item.category && !categoryMap.has(item.category.slug)) {
            categoryMap.set(item.category.slug, {
              id: item.category.slug,
              name: item.category.name,
              slug: item.category.slug,
              image: "/placeholder-category.jpg",
              subcategories: item.category.subCategories.map((sub) => ({
                id: sub.slug,
                name: sub.name,
                slug: sub.slug,
              })),
            });
          }
        });
        const categoriesArray = Array.from(categoryMap.values());
        setCategories(categoriesArray);

        // Extract subcategories for current category
        if (categorySlug) {
          const currentCategory = categoriesArray.find(cat => cat.slug === categorySlug);
          if (currentCategory?.subcategories) {
            setSubcategories(currentCategory.subcategories);
          }
        }

        // Filter items for extracting brands/warehouses
        const relevantItems = categorySlug
          ? allItems.filter(item => item.category.slug === categorySlug)
          : allItems;

        // Extract unique brands
        const brandMap = new Map();
        relevantItems.forEach((item) => {
          if (item.brand?.alias && item.brand?.name) {
            brandMap.set(item.brand.alias, {
              name: item.brand.name,
              slug: item.brand.alias,
            });
          }
        });
        setBrands(Array.from(brandMap.values()));

        // Extract unique warehouses
        const warehouseMap = new Map();
        relevantItems.forEach((item) => {
          item.prices.forEach((price) => {
            if (price.warehouse) {
              warehouseMap.set(price.warehouse.slug, {
                id: price.warehouse.slug,
                name: price.warehouse.name || price.warehouse.slug,
                country: price.warehouse.country?.name || "Unknown",
                displayedName:
                  price.warehouse.displayedName ||
                  price.warehouse.name ||
                  price.warehouse.slug,
              });
            }
          });
        });
        setWarehouses(Array.from(warehouseMap.values()));
      }
    } catch (err) {
      console.error('Error fetching category data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [locale, categorySlug, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    categories,
    brands,
    warehouses,
    subcategories,
    isLoading,
    error,
    refetch: fetchData,
  };
}
