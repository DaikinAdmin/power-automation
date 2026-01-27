import { useState, useEffect } from 'react';

interface Brand {
  id: string;
  name: string;
  alias: string;
  imageLink: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    items: number;
  };
}

interface UseAdminBrandsReturn {
  brands: Brand[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminBrands(): UseAdminBrandsReturn {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/brands');
      
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      } else {
        throw new Error('Failed to fetch brands');
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return {
    brands,
    isLoading,
    error,
    refetch: fetchBrands,
  };
}
