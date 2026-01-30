import { useState, useEffect, useCallback } from 'react';
import { ItemResponse } from '@/helpers/types/api-responses';

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

export function usePublicItems({ locale, filters }: UsePublicItemsParams): UsePublicItemsReturn {
  const [items, setItems] = useState<ItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query string
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
        setItems(data);
      } else {
        throw new Error('Failed to fetch items');
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [locale, JSON.stringify(filters)]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchItems,
  };
}
