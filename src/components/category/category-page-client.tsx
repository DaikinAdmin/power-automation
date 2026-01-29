"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart-context";
import { CartItemType } from "@/helpers/types/item";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";
import { calculateDiscountPercentage } from "@/helpers/pricing";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { useCurrency } from "@/hooks/useCurrency";
import { CategoryHeader } from "@/components/category/category-header";
import { CategorySidebar } from "@/components/category/category-sidebar";
import { ProductsGrid } from "@/components/category/products-grid";
import { MobileFilterDrawer } from "@/components/category/mobile-filter-drawer";
import { SubcategoryFilter } from "@/components/category/subcategory-filter";
import { Pagination } from "@/components/category/pagination";
import type { CategoryPageData } from "@/helpers/db/category-data-queries";
import type { ItemResponse } from "@/helpers/types/api-responses";

interface CategoryPageClientProps {
  locale: string;
  categorySlug: string;
  initialData: CategoryPageData;
  categoryName: string;
}

export function CategoryPageClient({
  locale,
  categorySlug,
  initialData,
  categoryName,
}: CategoryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useCart();

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sectionsOpen,
    toggleSection,
  } = useCatalogFilters();
  
  const { convertPrice, currencyCode } = useCurrency();

  const { getItemDetails, getItemPrice, getAvailableWarehouses } =
    useCatalogPricing({
      preferredCountryCode: locale ? locale.toUpperCase() : "PL",
    });

  // Get current filter values from URL
  const urlSubcategories = searchParams?.getAll('subcategory') || [];
  const urlBrands = searchParams?.getAll('brand') || [];
  const urlWarehouses = searchParams?.getAll('warehouse') || [];
  const currentPage = parseInt(searchParams?.get('page') || '1', 10);
  const pageSize = parseInt(searchParams?.get('limit') || '16', 10);

  // Function to update URL with parameters
  const updateURLParams = (updates: Record<string, string | string[] | number>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key);
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value) {
        params.set(key, value.toString());
      }
    });
    
    const newUrl = `/${locale}/category/${categorySlug}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl);
  };

  // Handler for subcategory filter toggle
  const handleSubcategoryToggle = (subcategorySlug: string) => {
    const currentSelected = urlSubcategories.includes(subcategorySlug)
      ? urlSubcategories.filter(s => s !== subcategorySlug)
      : [...urlSubcategories, subcategorySlug];
    
    updateURLParams({ 
      subcategory: currentSelected,
      page: 1 
    });
  };

  // Handler for brand selection
  const handleBrandSelection = (brand: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlBrands, brand]
      : urlBrands.filter(b => b !== brand);
    
    updateURLParams({ 
      brand: currentSelected,
      page: 1 
    });
  };

  // Handler for warehouse selection
  const handleWarehouseSelection = (warehouseId: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlWarehouses, warehouseId]
      : urlWarehouses.filter(w => w !== warehouseId);
    
    updateURLParams({ 
      warehouse: currentSelected,
      page: 1 
    });
  };

  // Handler for page size change
  const handlePageSizeChange = (newSize: number) => {
    updateURLParams({ 
      limit: newSize,
      page: 1 
    });
  };

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    updateURLParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler for sort change
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
  };

  // Calculate min/max prices from items
  // Category page always shows filtered items (by category), so use actual min/max
  const { minPrice, maxPrice } = useMemo(() => {
    if (initialData.items.length === 0) {
      return { minPrice: 0, maxPrice: 100000 };
    }
    
    const prices = initialData.items.map(item => {
      const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
      return convertPrice(price);
    });
    
    return {
      minPrice: Math.floor(Math.min(...prices)),
      maxPrice: Math.ceil(Math.max(...prices)),
    };
  }, [initialData.items, convertPrice]);

  // Client-side price filtering and sorting
  const sortedItems = useMemo(() => {
    return [...initialData.items]
      .filter((item) => {
        const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
        const convertedPrice = convertPrice(price);
        return convertedPrice >= priceRange[0] && convertedPrice <= priceRange[1];
      })
      .sort((a, b) => {
        const aDetails = a.details;
        const bDetails = b.details;
        const aPrice = a.prices[0]?.promotionPrice || a.prices[0]?.price || 0;
        const bPrice = b.prices[0]?.promotionPrice || b.prices[0]?.price || 0;

        switch (sortBy) {
          case "name":
            return (aDetails?.itemName || "").localeCompare(bDetails?.itemName || "");
          case "price-low":
            return aPrice - bPrice;
          case "price-high":
            return bPrice - aPrice;
          case "popularity":
            return (b.sellCounter || 0) - (a.sellCounter || 0);
          default:
            return 0;
        }
      });
  }, [initialData.items, priceRange, sortBy, convertPrice]);

  // Handler for adding to cart
  const handleAddToCart = (item: ItemResponse, warehouseId: string, price: number) => {
    const now = new Date();
    const details = getItemDetails(item);
    const subCategory = item.subCategorySlug
      ? item.category.subCategories.find((s: any) => s.slug === item.subCategorySlug)
      : null;

    const cartItem: Omit<CartItemType, "quantity"> = {
      id: `${item.articleId}-${warehouseId}`,
      slug: item.slug,
      articleId: item.articleId,
      alias: item.slug, // Use slug as alias since ItemResponse doesn't include alias field
      itemImageLink: item.itemImageLink,
      categorySlug: item.categorySlug,
      isDisplayed: item.isDisplayed,
      sellCounter: item.sellCounter,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      category: {
        ...item.category,
        id: item.category.slug,
        subCategories: [],
        categoryTranslations: [],
      },
      subCategory: subCategory
        ? ({
            ...subCategory,
            id: subCategory.slug,
            createdAt: subCategory.createdAt || now,
            updatedAt: subCategory.updatedAt || now,
          } as any)
        : {
            id: "",
            slug: "",
            name: "",
            categorySlug: "",
            isVisible: true,
            createdAt: now,
            updatedAt: now,
          },
      brandSlug: item.brandSlug ?? null,
      brand: item.brand
        ? ({
            ...item.brand,
            id: item.brand.alias,
            createdAt: item.brand.createdAt || now,
            updatedAt: item.brand.updatedAt || now,
          } as any)
        : null,
      warrantyType: (item.warrantyType || "manufacturer") as string,
      warrantyLength: (item.warrantyLength || 0) as number,
      itemDetails: [
        {
          ...item.details,
          id: item.articleId,
          itemSlug: item.slug,
        },
      ] as any,
      itemPrice: item.prices as any,
      price,
      warehouseId,
      displayName: details?.itemName,
      availableWarehouses: getAvailableWarehouses(item),
      linkedItems: [],
    };

    addToCart(cartItem);
  };

  return (
    <>
      {/* Category Header */}
      <CategoryHeader
        categoryName={categoryName}
        productsCount={initialData.pagination.totalItems}
        sortBy={sortBy}
        setSortBy={handleSortChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
        pageSize={pageSize}
        setPageSize={handlePageSizeChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Left Sidebar */}
        <CategorySidebar
          locale={locale}
          currentSlug={categorySlug}
          categories={initialData.categories}
          brands={initialData.brands}
          warehouses={initialData.warehouses}
          selectedBrands={urlBrands}
          selectedWarehouses={urlWarehouses}
          sectionsOpen={sectionsOpen}
          onBrandSelection={handleBrandSelection}
          onWarehouseSelection={handleWarehouseSelection}
          onToggleSection={toggleSection}
          showAllCategories={showAllCategories}
          setShowAllCategories={setShowAllCategories}
          sortBy={sortBy}
          setSortBy={handleSortChange}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setShowFilters={setShowFilters}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          totalItems={initialData.items.length}
        />

        {/* Products Grid/List */}
        <div className="lg:col-span-3">
          {/* Subcategory Filter */}
          <SubcategoryFilter
            subcategories={initialData.subcategories}
            selectedSubcategories={urlSubcategories}
            onSubcategoryToggle={handleSubcategoryToggle}
          />
          
          <ProductsGrid
            items={sortedItems}
            viewMode={viewMode}
            getItemDetails={getItemDetails}
            getItemPrice={getItemPrice}
            getAvailableWarehouses={getAvailableWarehouses}
            convertPrice={convertPrice}
            currencyCode={currencyCode}
            calculateDiscountPercentage={calculateDiscountPercentage}
            onAddToCart={handleAddToCart}
          />
          
          {/* Pagination Controls */}
          {initialData.pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={initialData.pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={initialData.pagination.hasNextPage}
              hasPreviousPage={initialData.pagination.hasPreviousPage}
            />
          )}
        </div>
      </div>

      {/* Off-canvas Filter Sidebar (Mobile) */}
      <MobileFilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        brands={initialData.brands}
        warehouses={initialData.warehouses}
        selectedBrands={urlBrands}
        selectedWarehouses={urlWarehouses}
        onBrandSelection={handleBrandSelection}
        onWarehouseSelection={handleWarehouseSelection}
        minPrice={minPrice}
        maxPrice={maxPrice}
        priceRange={priceRange}
        onPriceChange={setPriceRange}
        totalItems={initialData.items.length}
      />
    </>
  );
}
