'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';

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
  const [pageSize, setPageSize] = useState(16);

  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sectionsOpen,
    toggleSection,
  } = useCatalogFilters();
  const { convertPrice, currencyCode } = useCurrency();

  // Sync filters with URL parameters
  const urlBrands = searchParams?.getAll('brand') || [];
  const urlWarehouses = searchParams?.getAll('warehouse') || [];
  const searchQuery = searchParams?.get('search') || '';

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

  const { getItemDetails, getItemPrice, getAvailableWarehouses } =
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
    
    // Keep search query if exists
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    // Update URL
    const newUrl = `/${locale}/categories${params.toString() ? `?${params.toString()}` : ''}`;
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

  // Calculate min/max prices from items (prices are in base EUR currency)
  const minPrice = items.length > 0
    ? Math.floor(Math.min(...items.map(item => {
        const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
        return convertPrice(price);
      })))
    : 0;
  const maxPrice = items.length > 0
    ? Math.ceil(Math.max(...items.map(item => {
        const price = item.prices[0]?.promotionPrice || item.prices[0]?.price || 0;
        return convertPrice(price);
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
              productsCount={sortedItems.length}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
              pageSize={pageSize}
              setPageSize={setPageSize}
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
                {/* Left Sidebar with Categories */}
                <div className="space-y-6">
                  {/* Categories List */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">{t('filters.categories')}</h3>
                    <div className="space-y-2">
                      {(showAllCategories ? categories : categories.slice(0, 8)).map(
                        (category) => (
                          <Link
                            key={category.id}
                            href={`/${locale}/category/${category.slug}`}
                            className="block px-3 py-2 text-sm rounded-md transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          >
                            {category.name}
                          </Link>
                        )
                      )}
                    </div>
                    {categories.length > 8 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="w-full mt-3 text-sm"
                      >
                        {showAllCategories
                          ? t('filters.hideCategories') || "Приховати"
                          : t('filters.allCategories') || "Всі категорії"}
                      </Button>
                    )}
                  </Card>

                  {/* Mobile Controls */}
                  <div className="md:hidden flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(true)}
                      className="w-full justify-center"
                    >
                      {t('filter') || "Фільтр"}
                    </Button>
                  </div>

                  {/* Brands Filter (Desktop Only) */}
                  {brands.length > 0 && (
                    <Card className="hidden md:block p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('filters.brands')}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection("brands")}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              sectionsOpen.brands ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </div>
                      {sectionsOpen.brands && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {brands.map((brand) => (
                            <div key={brand.slug} className="flex items-center space-x-2">
                              <Checkbox
                                id={`brand-${brand.slug}`}
                                checked={urlBrands.includes(brand.slug)}
                                onCheckedChange={(checked) =>
                                  handleBrandSelectionWithURL(brand.slug, Boolean(checked))
                                }
                              />
                              <label
                                htmlFor={`brand-${brand.slug}`}
                                className="text-sm cursor-pointer"
                              >
                                {brand.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Warehouses Filter (Desktop Only) */}
                  {warehouses.length > 0 && (
                    <Card className="hidden md:block p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('filters.warehouses')}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection("warehouses")}
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              sectionsOpen.warehouses ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </div>
                      {sectionsOpen.warehouses && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {warehouses
                            .sort((a, b) =>
                              a.displayedName.localeCompare(b.displayedName)
                            )
                            .map((warehouse) => (
                              <div
                                key={warehouse.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`warehouse-${warehouse.id}`}
                                  checked={urlWarehouses.includes(warehouse.id)}
                                  onCheckedChange={(checked) =>
                                    handleWarehouseSelectionWithURL(warehouse.id, Boolean(checked))
                                  }
                                />
                                <label
                                  htmlFor={`warehouse-${warehouse.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {warehouse.displayedName}
                                </label>
                              </div>
                            ))}
                        </div>
                      )}
                    </Card>
                  )}
                </div>

                {/* Products Grid/List */}
                <div className="lg:col-span-3">
                  <ProductsGrid
                    items={sortedItems}
                    viewMode={viewMode}
                    getItemDetails={getItemDetails}
                    getItemPrice={getItemPrice}
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
                        id: `${item.articleId}-${warehouseId}`,
                        slug: item.articleId,
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
                            itemSlug: item.articleId,
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
        />
      </div>
    </PageLayout>
  );
}
