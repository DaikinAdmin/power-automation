import { useState, useEffect } from 'react';
import { Category } from '@/helpers/types/item';

interface UseAdminCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminCategories(): UseAdminCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/categories');
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
