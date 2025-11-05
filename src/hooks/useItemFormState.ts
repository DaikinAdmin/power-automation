'use client';

import { useCallback, useMemo, useState } from 'react';
import { Item } from '@/helpers/types/item';

type UseItemFormStateOptions = {
  initialItem?: Item | null;
};

export const useItemFormState = ({ initialItem }: UseItemFormStateOptions) => {
  const [formData, setFormData] = useState<Item | null>(initialItem ?? null);
  const [originalFormData, setOriginalFormData] = useState<Item | null>(initialItem ? JSON.parse(JSON.stringify(initialItem)) : null);

  const hasChanges = useMemo(() => {
    if (!formData && !originalFormData) return false;
    if (!formData || !originalFormData) return true;
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  }, [formData, originalFormData]);

  const updateFormData = useCallback((updater: (prev: Item) => Item) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  }, []);

  const setItemFormData = useCallback((value: Item | ((prev: Item) => Item)) => {
    setFormData((prev) => {
      if (typeof value === 'function') {
        if (!prev) return prev;
        return (value as (prev: Item) => Item)(prev);
      }
      return value;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormData(originalFormData ? JSON.parse(JSON.stringify(originalFormData)) : null);
  }, [originalFormData]);

  const setInitialData = useCallback((item: Item) => {
    setFormData(item);
    setOriginalFormData(JSON.parse(JSON.stringify(item)));
  }, []);

  return {
    formData,
    setFormData,
    updateFormData,
    setItemFormData,
    originalFormData,
    resetForm,
    hasChanges,
    setInitialData,
    setOriginalFormData,
  };
};
