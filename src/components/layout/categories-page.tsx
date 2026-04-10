'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useCart } from "@/components/cart-context";
import PageLayout from '@/components/layout/page-layout';
import { CartItemType } from '@/helpers/types/item';
import { useCatalogPricing } from '@/hooks/useCatalogPricing';
import { useCategoryData } from '@/hooks/useCategoryData';
import { calculateDiscountPercentage } from '@/helpers/pricing';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useCurrency } from '@/hooks/useCurrency';
import { CategoryBreadcrumb } from '@/components/category/category-breadcrumb';
import { CategoryHeader } from '@/components/category/category-header';
import { CategorySidebar } from '@/components/category/category-sidebar';
import { ProductsGrid } from '@/components/category/products-grid';
import { MobileFilterDrawer } from '@/components/category/mobile-filter-drawer';
import { Pagination } from '@/components/category/pagination';
import { useTranslations } from 'next-intl';

export default function CategoriesPage({ locale }: { locale: string }) {
  const t = useTranslations('categories');
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    addToCart,
  } = useCart();

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const currentPage = Number(searchParams?.get('page') || '1');
  const pageSize = Number(searchParams?.get('pageSize') || '16');

  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sectionsOpen,
    toggleSection,
  } = useCatalogFilters();
  const { convertPrice, convertFromCurrency, currencyCode } = useCurrency();

  // Sync filters with URL parameters
  const urlBrands = searchParams?.getAll('brand') || [];
  const urlWarehouses = searchParams?.getAll('warehouse') || [];
  const searchQuery = searchParams?.get('search') || '';

  const updatePageInURL = (page: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (page > 1) {
      params.set('page', String(page));
    } else {
      params.delete('page');
    }
    const size = newPageSize ?? pageSize;
    if (size !== 16) {
      params.set('pageSize', String(size));
    } else {
      params.delete('pageSize');
    }
    const newUrl = `/categories${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  // Use custom hook for fetching all category data
  const {
    items,
    categories,
    brands,
    warehouses,
    isLoading,
  } = useCategoryData({
    locale,
    filters: {
      brand: urlBrands,
      warehouse: urlWarehouses,
      ...(searchQuery && { search: searchQuery }),
    },
  });

  const { getItemDetails, getItemPrice, getMinPrice, getAvailableWarehouses } =
    useCatalogPricing({
      preferredCountryCode: locale ? locale.toUpperCase() : "PL",
    });

  // Function to update URL with filter parameters
  const updateURLParams = (filterType: 'brand' | 'warehouse', values: string[]) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Remove all existing params of this type
    params.delete(filterType);
    
    // Add new values
    values.forEach(value => params.append(filterType, value));

    // Reset to page 1 on filter change
    params.delete('page');
    
    // Keep search query if exists
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    // Update URL
    const newUrl = `/categories${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  // Update handlers to work with URL
  const handleBrandSelectionWithURL = (brand: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlBrands, brand]
      : urlBrands.filter(b => b !== brand);
    
    updateURLParams('brand', currentSelected);
  };

  const handleWarehouseSelectionWithURL = (warehouseId: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlWarehouses, warehouseId]
      : urlWarehouses.filter(w => w !== warehouseId);
    
    updateURLParams('warehouse', currentSelected);
  };

  // Handler for page size change
  const handlePageSizeChange = (newSize: number) => {
    updatePageInURL(1, newSize);
  };

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    updatePageInURL(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate min/max prices from items (prices are in base EUR currency)
  // If no filters are applied, use full range (0 to 100000)
  // If filters are applied, use actual min/max from filtered items
  const hasActiveFilters = urlBrands.length > 0 || urlWarehouses.length > 0 || searchQuery !== '';
  
  const minPrice = hasActiveFilters && items.length > 0
    ? Math.floor(Math.min(...items.map(item => {
        const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
        const fromCurrency = ((item.prices[0] as any)?.initialCurrency as import('@/helpers/currency').SupportedCurrency) ?? 'EUR';
        return convertFromCurrency(price, fromCurrency);
      })))
    : 0;
  const maxPrice = hasActiveFilters && items.length > 0
    ? Math.ceil(Math.max(...items.map(item => {
        const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
        const fromCurrency = ((item.prices[0] as any)?.initialCurrency as import('@/helpers/currency').SupportedCurrency) ?? 'EUR';
        return convertFromCurrency(price, fromCurrency);
      })))
    : 100000;

  // Update price range when items change
  useEffect(() => {
    if (items.length > 0 && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
      setPriceRange([minPrice, maxPrice]);
    }
  }, [items, minPrice, maxPrice]);

  // Client-side price filtering and sorting
  const sortedItems = [...items]
    .filter((item) => {
      const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
      const fromCurrency = ((item.prices[0] as any)?.initialCurrency as import('@/helpers/currency').SupportedCurrency) ?? 'EUR';
      const convertedPrice = convertFromCurrency(price, fromCurrency);
      return convertedPrice >= priceRange[0] && convertedPrice <= priceRange[1];
    })
    .sort((a, b) => {
      const aInStock = a.prices.some((p: any) => p.quantity > 0);
      const bInStock = b.prices.some((p: any) => p.quantity > 0);
      if (aInStock !== bInStock) return aInStock ? -1 : 1;

      const aDetails = a.details;
      const bDetails = b.details;
      const aPrice = a.prices[0]?.promotionPrice || a.prices[0]?.price || 0;
      const bPrice = b.prices[0]?.promotionPrice || b.prices[0]?.price || 0;

      switch (sortBy) {
        case "name":
          return (aDetails?.itemName || "").localeCompare(
            bDetails?.itemName || ""
          );
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

  // Apply pagination
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      updatePageInURL(1);
    }
  }, [totalPages, currentPage]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="overflow-x-hidden">
          <div className="max-w-[90rem] w-full mx-auto px-2 sm:px-4 py-4 sm:py-8">
            {/* Breadcrumb */}
            <CategoryBreadcrumb
              locale={locale}
              categoryName={searchQuery ? `${t('breadcrumb.search')}: "${searchQuery}"` : t('breadcrumb.allCategories')}
            />

            {/* Category Header */}
            <CategoryHeader
              categoryName={searchQuery ? t('searchResults') : t('pageTitle')}
              productsCount={totalItems}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
              pageSize={pageSize}
              setPageSize={handlePageSizeChange}
            />

            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Sidebar */}
                <CategorySidebar
                  locale={locale}
                  currentSlug=""
                  categories={categories}
                  brands={brands}
                  warehouses={warehouses}
                  selectedBrands={urlBrands}
                  selectedWarehouses={urlWarehouses}
                  sectionsOpen={sectionsOpen}
                  onBrandSelection={handleBrandSelectionWithURL}
                  onWarehouseSelection={handleWarehouseSelectionWithURL}
                  onToggleSection={toggleSection}
                  showAllCategories={showAllCategories}
                  setShowAllCategories={setShowAllCategories}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  setShowFilters={setShowFilters}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  priceRange={priceRange}
                  onPriceChange={setPriceRange}
                  totalItems={items.length}
                />

                {/* Products Grid/List */}
                <div className="lg:col-span-3">
                  <ProductsGrid
                    items={paginatedItems}
                    viewMode={viewMode}
                    getItemDetails={getItemDetails}
                    getItemPrice={getItemPrice}
                    getMinPrice={getMinPrice}
                    getAvailableWarehouses={getAvailableWarehouses}
                    convertPrice={convertPrice}
                    currencyCode={currencyCode}
                    calculateDiscountPercentage={calculateDiscountPercentage}
                    onAddToCart={(item, warehouseId, price) => {
                      const now = new Date();
                      const details = getItemDetails(item);
                      const subCategory = item.subCategorySlug
                        ? item.category.subCategories.find(
                            (s: any) => s.slug === item.subCategorySlug
                          )
                        : null;

                      const cartItem: Omit<CartItemType, "quantity"> = {
                        id: `${item.slug}-${warehouseId}`,
                        slug: item.slug,
                        alias: null,
                        articleId: item.articleId,
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
                        warrantyType: item.warrantyType ?? 'manufacturer',
                        warrantyLength: item.warrantyLength ?? 12,
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
                    }}
                  />
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      hasNextPage={currentPage < totalPages}
                      hasPreviousPage={currentPage > 1}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Off-canvas Filter Sidebar (Mobile) */}
        <MobileFilterDrawer
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          brands={brands}
          warehouses={warehouses}
          selectedBrands={urlBrands}
          selectedWarehouses={urlWarehouses}
          onBrandSelection={handleBrandSelectionWithURL}
          onWarehouseSelection={handleWarehouseSelectionWithURL}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          totalItems={items.length}
        />
      </div>
    </PageLayout>
  );
}
