import { useState, useEffect, useCallback } from 'react';
import { Item } from '@/helpers/types/item';

interface ItemsStats {
  total: number;
  selected: number;
  displayed: number;
  hidden: number;
}

interface ItemsFilters {
  brands: string[];
  categories: string[];
}

interface ItemsPagination {
  totalPages: number;
  totalItems: number;
}

interface UseAdminItemsParams {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  selectedBrand: string;
  selectedCategory: string;
  hideHidden?: boolean;
}

interface UseAdminItemsReturn {
  items: Item[];
  isLoading: boolean;
  stats: ItemsStats;
  pagination: ItemsPagination;
  filters: ItemsFilters;
  refetch: () => Promise<void>;
}

export function useAdminItems({
  currentPage,
  pageSize,
  searchTerm,
  selectedBrand,
  selectedCategory,
  hideHidden = false,
}: UseAdminItemsParams): UseAdminItemsReturn {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cachedEtag, setCachedEtag] = useState<string | null>(null);
  
  const [stats, setStats] = useState<ItemsStats>({
    total: 0,
    selected: 0,
    displayed: 0,
    hidden: 0,
  });
  
  const [pagination, setPagination] = useState<ItemsPagination>({
    totalPages: 1,
    totalItems: 0,
  });
  
  const [filters, setFilters] = useState<ItemsFilters>({
    brands: [],
    categories: [],
  });

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (searchTerm) params.set('search', searchTerm);
      if (selectedBrand) params.set('brand', selectedBrand);
      if (selectedCategory) params.set('category', selectedCategory);
      if (hideHidden) params.set('hideHidden', 'true');
      
      // Include ETag in request headers if we have one
      const headers: HeadersInit = {};
      if (cachedEtag) {
        headers['If-None-Match'] = cachedEtag;
      }
      
      const response = await fetch(`/api/admin/items?${params.toString()}`, { headers });
      
      if (response.status === 304) {
        // Not Modified - use cached data
        console.log('Using cached items data');
        setIsLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setPagination({
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems,
        });
        setStats(data.stats);
        setFilters({
          brands: data.filters.brands,
          categories: data.filters.categories,
        });
        
        // Store the ETag for future requests
        const newEtag = response.headers.get('ETag');
        if (newEtag) {
          setCachedEtag(newEtag);
        }
      } else {
        console.error('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedBrand, selectedCategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    stats,
    pagination,
    filters,
    refetch: fetchItems,
  };
}
