import { useState, useEffect } from 'react';

interface Warehouse {
  id: string;
  isVisible: boolean;
  displayedName: string;
  name: string | null;
  countrySlug: string | null;
  _count?: {
    item_price: number;
  };
}

interface UseAdminWarehousesReturn {
  warehouses: Warehouse[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAdminWarehouses(): UseAdminWarehousesReturn {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/warehouses');
      
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      } else {
        throw new Error('Failed to fetch warehouses');
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  return {
    warehouses,
    isLoading,
    error,
    refetch: fetchWarehouses,
  };
}
