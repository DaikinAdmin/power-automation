"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart-context";
import PageLayout from "@/components/layout/page-layout";
import { CartItemType } from "@/helpers/types/item";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";
import { useCategoryData } from "@/hooks/useCategoryData";
import { calculateDiscountPercentage } from "@/helpers/pricing";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { useCurrency } from "@/hooks/useCurrency";
import { CategoryBreadcrumb } from "@/components/category/category-breadcrumb";
import { CategoryHeader } from "@/components/category/category-header";
import { CategorySidebar } from "@/components/category/category-sidebar";
import { ProductsGrid } from "@/components/category/products-grid";
import { MobileFilterDrawer } from "@/components/category/mobile-filter-drawer";
import { SubcategoryFilter } from "@/components/category/subcategory-filter";
import { Pagination } from "@/components/category/pagination";
import { useTranslations } from "next-intl";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("categories");
  const {
    cartItems,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getTotalCartItems,
    isCartModalOpen,
    setIsCartModalOpen,
  } = useCart();

  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);

  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    selectedBrands,
    handleBrandSelection,
    selectedWarehouses,
    handleWarehouseSelection,
    selectedSubcategories,
    handleSubcategorySelection,
    sectionsOpen,
    toggleSection,
  } = useCatalogFilters();
  const { convertPrice, currencyCode } = useCurrency();

  // Sync filters with URL parameters
  const urlSubcategories = searchParams?.getAll('subcategory') || [];
  const urlBrands = searchParams?.getAll('brand') || [];
  const urlWarehouses = searchParams?.getAll('warehouse') || [];

  // Use custom hook for fetching category data
  const {
    items,
    categories,
    brands,
    warehouses,
    subcategories,
    isLoading,
    pagination,
  } = useCategoryData({
    locale,
    categorySlug: slug,
    filters: {
      brand: urlBrands,
      warehouse: urlWarehouses,
      subcategory: urlSubcategories,
    },
    pagination: {
      page: currentPage,
      limit: pageSize,
    },
  });

  const { getItemDetails, getItemPrice, getAvailableWarehouses } =
    useCatalogPricing({
      preferredCountryCode: locale ? locale.toUpperCase() : "PL",
    });

  // Function to update URL with filter parameters
  const updateURLParams = (filterType: 'subcategory' | 'brand' | 'warehouse', values: string[]) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Remove all existing params of this type
    params.delete(filterType);
    
    // Add new values
    values.forEach(value => params.append(filterType, value));
    
    // Update URL
    const newUrl = `/${locale}/category/${slug}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  };

  // Handler for subcategory filter toggle
  const handleSubcategoryToggle = (subcategorySlug: string) => {
    const currentSelected = urlSubcategories.includes(subcategorySlug)
      ? urlSubcategories.filter(s => s !== subcategorySlug)
      : [...urlSubcategories, subcategorySlug];
    
    updateURLParams('subcategory', currentSelected);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Update handlers to work with URL
  const handleBrandSelectionWithURL = (brand: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlBrands, brand]
      : urlBrands.filter(b => b !== brand);
    
    updateURLParams('brand', currentSelected);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleWarehouseSelectionWithURL = (warehouseId: string, checked: boolean) => {
    const currentSelected = checked
      ? [...urlWarehouses, warehouseId]
      : urlWarehouses.filter(w => w !== warehouseId);
    
    updateURLParams('warehouse', currentSelected);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Handler for page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const getOriginalCategoryName = () => {
    const currentCategory = categories.find((cat) => cat.slug === slug);
    return (
      currentCategory?.name ||
      slug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main className="overflow-x-hidden">
          <div className="max-w-[90rem] w-full mx-auto px-2 sm:px-4 py-4 sm:py-8">
            {/* Breadcrumb */}
            <CategoryBreadcrumb
              locale={locale}
              categoryName={getOriginalCategoryName()}
            />

            {/* Category Header */}
            <CategoryHeader
              categoryName={getOriginalCategoryName()}
              productsCount={pagination?.totalItems || sortedItems.length}
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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
                
                {/* Left Sidebar */}
                <CategorySidebar
                  locale={locale}
                  currentSlug={slug}
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
                />

                {/* Products Grid/List */}
                <div className="lg:col-span-3">
                  {/* Subcategory Filter */}
                  <SubcategoryFilter
                    subcategories={subcategories}
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
                        slug: item.slug,
                        articleId: item.articleId,
                        alias: item.alias,
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
                        warrantyType: item.warrantyType ?? null,
                        warrantyLength: item.warrantyLength ?? null,
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
                  {pagination && pagination.totalPages > 1 && (
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                      hasNextPage={pagination.hasNextPage}
                      hasPreviousPage={pagination.hasPreviousPage}
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
        />
      </div>
    </PageLayout>
  );
}