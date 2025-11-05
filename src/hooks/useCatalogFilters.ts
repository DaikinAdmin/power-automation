'use client';

import { useCallback, useState } from 'react';

type SectionKey = 'brands' | 'warehouses' | 'subcategories' | 'categories';

type SelectionHandler = (value: string, checked: boolean) => void;

type InitialConfig = {
  viewMode?: 'grid' | 'list';
  sortBy?: string;
  selectedBrands?: string[];
  selectedWarehouses?: string[];
  selectedSubcategories?: string[];
  selectedCategories?: string[];
  sectionsOpen?: Partial<Record<SectionKey, boolean>>;
};

const updateSelection = (items: string[], value: string, checked: boolean) => {
  if (checked) {
    if (items.includes(value)) {
      return items;
    }
    return [...items, value];
  }
  return items.filter((item) => item !== value);
};

export const useCatalogFilters = (initialConfig: InitialConfig = {}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialConfig.viewMode ?? 'grid');
  const [sortBy, setSortBy] = useState(initialConfig.sortBy ?? 'name');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialConfig.selectedBrands ?? []);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>(initialConfig.selectedWarehouses ?? []);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(initialConfig.selectedSubcategories ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialConfig.selectedCategories ?? []);
  const [sectionsOpen, setSectionsOpen] = useState<Record<SectionKey, boolean>>({
    brands: initialConfig.sectionsOpen?.brands ?? true,
    warehouses: initialConfig.sectionsOpen?.warehouses ?? true,
    subcategories: initialConfig.sectionsOpen?.subcategories ?? true,
    categories: initialConfig.sectionsOpen?.categories ?? true,
  });

  const handleBrandSelection: SelectionHandler = useCallback((value, checked) => {
    setSelectedBrands((prev) => updateSelection(prev, value, checked));
  }, []);

  const handleWarehouseSelection: SelectionHandler = useCallback((value, checked) => {
    setSelectedWarehouses((prev) => updateSelection(prev, value, checked));
  }, []);

  const handleSubcategorySelection: SelectionHandler = useCallback((value, checked) => {
    setSelectedSubcategories((prev) => updateSelection(prev, value, checked));
  }, []);

  const handleCategorySelection: SelectionHandler = useCallback((value, checked) => {
    setSelectedCategories((prev) => updateSelection(prev, value, checked));
  }, []);

  const toggleSection = useCallback((section: SectionKey) => {
    setSectionsOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const setSectionOpen = useCallback((section: SectionKey, isOpen: boolean) => {
    setSectionsOpen((prev) => ({
      ...prev,
      [section]: isOpen,
    }));
  }, []);

  return {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedBrands,
    setSelectedBrands,
    handleBrandSelection,
    selectedWarehouses,
    setSelectedWarehouses,
    handleWarehouseSelection,
    selectedSubcategories,
    setSelectedSubcategories,
    handleSubcategorySelection,
    selectedCategories,
    setSelectedCategories,
    handleCategorySelection,
    sectionsOpen,
    toggleSection,
    setSectionOpen,
  };
};
