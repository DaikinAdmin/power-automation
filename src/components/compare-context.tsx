'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CompareItem {
  id: string;
  articleId: string;
  name: string;
  brand?: string | null;
  brandImage?: string | null;
  image: string | null;
  price: number;
  specialPrice?: number | null;
  description?: string | null;
  categorySlug?: string;
}

interface CompareContextType {
  compareItems: CompareItem[];
  addToCompare: (item: CompareItem) => boolean;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  isCompareModalOpen: boolean;
  setIsCompareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_ITEMS = 5;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Load compare list from localStorage when component mounts
  useEffect(() => {
    const savedCompare = localStorage.getItem('compare');
    if (savedCompare) {
      try {
        const parsed: CompareItem[] = JSON.parse(savedCompare);
        setCompareItems(parsed.slice(0, MAX_COMPARE_ITEMS));
      } catch (e) {
        console.error('Failed to parse compare list from localStorage:', e);
      }
    }
  }, []);

  // Save compare list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('compare', JSON.stringify(compareItems));
  }, [compareItems]);

  const addToCompare = (item: CompareItem): boolean => {
    // Check if item already exists
    if (compareItems.some((i) => i.id === item.id)) {
      return false;
    }

    // Check if we've reached the limit
    if (compareItems.length >= MAX_COMPARE_ITEMS) {
      return false;
    }

    setCompareItems((prev) => [...prev, item]);
    return true;
  };

  const removeFromCompare = (id: string) => {
    setCompareItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompare = () => {
    setCompareItems([]);
  };

  const isInCompare = (id: string): boolean => {
    return compareItems.some((item) => item.id === id);
  };

  return (
    <CompareContext.Provider
      value={{
        compareItems,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        isCompareModalOpen,
        setIsCompareModalOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
