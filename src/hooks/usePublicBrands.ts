import { useState, useEffect } from 'react';

interface PublicBrand {
  alias: string;
  name: string;
  imageLink: string;
}

interface UsePublicBrandsReturn {
  brands: PublicBrand[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePublicBrands(): UsePublicBrandsReturn {
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/public/brands');
      
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
