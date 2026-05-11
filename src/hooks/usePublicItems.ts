import { useState, useEffect, useCallback } from 'react';
import { ItemResponse } from '@/helpers/types/api-responses';
import { useCatalogData } from '@/components/catalog-data-context';

interface UsePublicItemsParams {
  locale: string;
  filters?: {
    brand?: string[];
    warehouse?: string[];
    search?: string;
    category?: string;
    subcategory?: string[];
  };
}

interface UsePublicItemsReturn {
  items: ItemResponse[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function hasActiveFilters(filters?: UsePublicItemsParams['filters']): boolean {
  if (!filters) return false;
  return !!(
    filters.search ||
    filters.category ||
    (filters.brand && filters.brand.length > 0) ||
    (filters.warehouse && filters.warehouse.length > 0) ||
    (filters.subcategory && filters.subcategory.length > 0)
  );
}

export function usePublicItems({ locale, filters }: UsePublicItemsParams): UsePublicItemsReturn {
  const { items: contextItems, isItemsLoading } = useCatalogData();

  const [filteredItems, setFilteredItems] = useState<ItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const needsFetch = hasActiveFilters(filters);

  const fetchItems = useCallback(async () => {
    if (!needsFetch) return;
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.category) params.set('category', filters.category);
      filters?.brand?.forEach(b => params.append('brand', b));
      filters?.warehouse?.forEach(w => params.append('warehouse', w));
      filters?.subcategory?.forEach(s => params.append('subcategory', s));

      const queryString = params.toString();
      const url = `/api/public/items/${locale}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setFilteredItems(data);
      } else {
        throw new Error('Failed to fetch items');
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, JSON.stringify(filters), needsFetch]);

  useEffect(() => {
    if (needsFetch) {
      fetchItems();
    }
  }, [fetchItems, needsFetch]);

  if (!needsFetch) {
    return {
      items: contextItems,
      isLoading: isItemsLoading,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    items: filteredItems,
    isLoading,
    error,
    refetch: fetchItems,
  };
}
