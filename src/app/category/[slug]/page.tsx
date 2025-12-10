'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChevronDown, Grid, List } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import PageLayout from '@/components/layout/page-layout';
import CatalogProductCard from '@/components/catalog-product-card';
import { Item, CartItemType } from '@/helpers/types/item';
import { useCatalogPricing } from '@/hooks/useCatalogPricing';
import { calculateDiscountPercentage } from '@/helpers/pricing';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslations } from 'next-intl';


export default function CategoryPage() {
  const t = useTranslations('categories');
  const params = useParams();
  const slug = params?.slug as string;
  const { cartItems, addToCart, updateCartQuantity, removeFromCart, getTotalCartItems, isCartModalOpen, setIsCartModalOpen } = useCart();

  // All category page states
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string, name: string, country: string, displayedName: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string, name: string, slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Header states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; image: string; subcategories: { id: string, name: string, slug: string }[] }[]>([]);

  const { getItemDetails, getItemPrice, getAvailableWarehouses } = useCatalogPricing({
    preferredCountryCode: 'PL'
  });

  useEffect(() => {
    fetchCategoryData();
  }, [slug]);

  useEffect(() => {
    applyFilters();
  }, [items, selectedBrands, selectedWarehouses, selectedSubcategories, sortBy]);

  const fetchCategoryData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/public/items/pl');
      if (response.ok) {
        const data: Item[] = await response.json();

        // Build category map from the data
        const categoryMap = new Map<string, {
          id: string;
          name: string;
          slug: string;
          image: string;
          subcategories: Map<string, { id: string, name: string, slug: string }>;
        }>();

        data.forEach(item => {
          const { category, subCategory } = item;
          
          if (category) {
            if (!categoryMap.has(category.id)) {
              categoryMap.set(category.id, {
                id: category.id,
                name: category.name,
                slug: category.slug,
                image: "/placeholder-category.jpg",
                subcategories: new Map()
              });
            }
            
            if (subCategory) {
              const subMap = categoryMap.get(category.id)!.subcategories;
              if (!subMap.has(subCategory.id)) {
                subMap.set(subCategory.id, {
                  id: subCategory.id,
                  name: subCategory.name,
                  slug: subCategory.slug
                });
              }
            }
          }
        });

        // Convert maps to arrays for state
        const categoriesArray = Array.from(categoryMap.values()).map(cat => ({
          ...cat,
          subcategories: Array.from(cat.subcategories.values())
        }));
        
        setCategories(categoriesArray);

        // Filter items by current category slug
        const currentCategory = categoriesArray.find(cat => cat.slug === slug);
        let categoryItems: Item[] = [];
        
        if (currentCategory) {
          categoryItems = data.filter(item => item.category.slug === slug);
          
          // Extract unique subcategories for this category
          const uniqueSubcategories = Array.from(
            new Map(
              categoryItems.map(item => [item.subCategory.id, item.subCategory])
            ).values()
          );
          setSubcategories(uniqueSubcategories);
          
          // Extract unique brands for this category
          const uniqueBrands = Array.from(
            new Set(
              categoryItems
                .map(item => item.brand?.name || item.brandName)
                .filter((name): name is string => Boolean(name))
            )
          );
          setBrands(uniqueBrands);
          
          // Extract unique warehouses for this category
          const warehouseMap = new Map();
          categoryItems.forEach(item => {
            item.itemPrice.forEach(price => {
              if (price.warehouse) {
                warehouseMap.set(price.warehouse.id, {
                  id: price.warehouse.id,
                  name: price.warehouse.name || price.warehouse.id,
                  country: price.warehouse.country || 'Unknown',
                  displayedName: price.warehouse.displayedName || price.warehouse.name || price.warehouse.id
                });
              }
            });
          });
          const uniqueWarehouses = Array.from(warehouseMap.values());
          setWarehouses(uniqueWarehouses);
        }
        
        setItems(categoryItems);
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Filter by brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(item => {
        const brandName = item.brand?.name || item.brandName;
        return brandName ? selectedBrands.includes(brandName) : false;
      });
    }

    // Filter by warehouses
    if (selectedWarehouses.length > 0) {
      filtered = filtered.filter(item =>
        item.itemPrice.some(price =>
          selectedWarehouses.includes(price.warehouse.id)
        )
      );
    }

    // Filter by subcategories
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(item =>
        selectedSubcategories.includes(item.subCategory.id)
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      const aDetails = a.itemDetails[0];
      const bDetails = b.itemDetails[0];
      const aPrice = a.itemPrice[0]?.promotionPrice || a.itemPrice[0]?.price || 0;
      const bPrice = b.itemPrice[0]?.promotionPrice || b.itemPrice[0]?.price || 0;

      switch (sortBy) {
        case 'name':
          return (aDetails?.itemName || '').localeCompare(bDetails?.itemName || '');
        case 'price-low':
          return aPrice - bPrice;
        case 'price-high':
          return bPrice - aPrice;
        case 'popularity':
          return (b.sellCounter || 0) - (a.sellCounter || 0);
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  };

  const getOriginalCategoryName = () => {
    const currentCategory = categories.find(cat => cat.slug === slug);
    return currentCategory?.name || slug.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">

        {/* Main Content */}
        <main>
          <div className="container mx-auto py-8">
            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex items-center space-x-2 text-sm text-gray-600">
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  {t('breadcrumb.home')}
                </Link>
                <span>/</span>
                <Link href="/categories" className="hover:text-blue-600 transition-colors">
                  {t('breadcrumb.allCategories')}
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{getOriginalCategoryName()}</span>
              </nav>
            </div>

            {/* Category Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">{getOriginalCategoryName()}</h1>
                <p className="text-gray-600 mt-2">
                  {filteredItems.length} {t('productsFound')}
                </p>
              </div>

              {/* Centered Sort Options with View on Right */}
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{t('sortBy')}</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant={sortBy === 'popularity' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('popularity')}
                      className={`${sortBy === 'popularity' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-r-none`}
                    >
                      {t('popularity')}
                    </Button>
                    <Button
                      variant={sortBy === 'price-low' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('price-low')}
                      className={`${sortBy === 'price-low' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-none border-l border-r`}
                    >
                      {t('priceLow')}
                    </Button>
                    <Button
                      variant={sortBy === 'price-high' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('price-high')}
                      className={`${sortBy === 'price-high' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-none border-r`}
                    >
                      {t('priceHigh')}
                    </Button>
                    <Button
                      variant={sortBy === 'name' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('name')}
                      className={`${sortBy === 'name' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-l-none`}
                    >
                      {t('name')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle - Far Right */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t('view')}</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`${viewMode === 'grid' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-r-none flex items-center`}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`${viewMode === 'list' ? 'bg-red-500 hover:bg-red-600 text-white' : ''} rounded-l-none flex items-center`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Sidebar */}
                <div className="space-y-6">
                  {/* Categories List */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">{t('filters.categories')}</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/category/${category.slug}`}
                          className={`block px-3 py-2 text-sm rounded-md transition-colors ${category.slug === slug
                              ? 'bg-red-500 text-white font-medium'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </Card>

                  {/* Brands Filter */}
                  {brands.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('filters.brands')}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('brands')}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.brands ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                      {sectionsOpen.brands && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {brands.map((brand) => (
                            <div key={brand} className="flex items-center space-x-2">
                              <Checkbox
                                id={`brand-${brand}`}
                                checked={selectedBrands.includes(brand)}
                                onCheckedChange={(checked) =>
                                  handleBrandSelection(brand, Boolean(checked))
                                }
                              />
                              <label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">
                                {brand}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Warehouses Filter */}
                  {warehouses.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('filters.warehouses')}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('warehouses')}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.warehouses ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                      {sectionsOpen.warehouses && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {warehouses
                            .sort((a, b) => a.displayedName.localeCompare(b.displayedName))
                            .map((warehouse) => (
                            <div key={warehouse.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`warehouse-${warehouse.id}`}
                                checked={selectedWarehouses.includes(warehouse.id)}
                                onCheckedChange={(checked) =>
                                  handleWarehouseSelection(warehouse.id, Boolean(checked))
                                }
                              />
                              <label htmlFor={`warehouse-${warehouse.id}`} className="text-sm cursor-pointer">
                                {warehouse.displayedName}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Subcategories Filter */}
                  {subcategories.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t('filters.subcategories')}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('subcategories')}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.subcategories ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                      {sectionsOpen.subcategories && (
                        <div className="space-y-2">
                          {subcategories.map((subcategory) => (
                            <div key={subcategory.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`subcategory-${subcategory.id}`}
                                checked={selectedSubcategories.includes(subcategory.id)}
                                onCheckedChange={(checked) =>
                                  handleSubcategorySelection(subcategory.id, Boolean(checked))
                                }
                              />
                              <label htmlFor={`subcategory-${subcategory.id}`} className="text-sm cursor-pointer">
                                {subcategory.name}
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
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-16">
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">{t('noResults')}</h3>
                      <p className="text-gray-500">{t('adjustFilters')}</p>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${viewMode === 'grid'
                        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                        : 'grid-cols-1'
                      }`}>
                      {filteredItems.map((item) => {
                        const details = getItemDetails(item);
                        const { price, originalPrice, inStock, warehouseName, quantity, warehouseId, displayedName } = getItemPrice(item);
                        const convertedPrice = convertPrice(price);
                        const convertedOriginalPrice = originalPrice != null ? convertPrice(originalPrice) : null;
                        const hasMultipleWarehouses = item.itemPrice.length > 1;
                      
                        const badge = originalPrice
                          ? {
                              text: `-${calculateDiscountPercentage(originalPrice, price)}%`,
                              className: 'bg-red-500 text-white'
                            }
                          : undefined;
                      
                        const stockBadge = {
                          text: inStock ? `${quantity} ${t('inStock')}` : t('outOfStock'),
                          className: inStock ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        };
                      
                        const warehouseLabel = `${t('from')} ${displayedName || warehouseName || 'Unknown Warehouse'}`;
                        const warehouseExtraLabel = hasMultipleWarehouses
                          ? `+${item.itemPrice.length - 1} ${item.itemPrice.length > 2 ? t('moreLocations') : t('moreLocation')}`
                          : undefined;
                      
                        const addToCartHandler = () => {
                          if (!inStock) {
                            return;
                          }

                          const now = new Date();
                          const cartItem: Omit<CartItemType, 'quantity'> = {
                            id: `${item.id}-${warehouseId}`,
                            articleId: item.articleId,
                            itemImageLink: item.itemImageLink,
                            categoryId: item.categoryId,
                            subCategoryId: item.subCategoryId,
                            isDisplayed: item.isDisplayed,
                            sellCounter: item.sellCounter,
                            createdAt: item.createdAt,
                            updatedAt: item.updatedAt,
                            category: {
                              ...item.category,
                              subCategories: [],
                            },
                            subCategory: {
                              ...item.subCategory,
                              createdAt: item.subCategory.createdAt || now,
                              updatedAt: item.subCategory.updatedAt || now,
                            },
                            brandId: item.brandId ?? null,
                            brandName: item.brand?.name || item.brandName || '',
                            brand: item.brand
                              ? {
                                  ...item.brand,
                                  createdAt: item.brand.createdAt || now,
                                  updatedAt: item.brand.updatedAt || now,
                                }
                              : null,
                            warrantyType: item.warrantyType ?? null,
                            warrantyLength: item.warrantyLength ?? null,
                            itemDetails: item.itemDetails,
                            itemPrice: item.itemPrice,
                            price,
                            warehouseId,
                            displayName: details?.itemName,
                            availableWarehouses: getAvailableWarehouses(item),
                          };

                          addToCart(cartItem);
                        };
                      
                        return (
                          <CatalogProductCard
                            key={item.id}
                            href={`/product/${item.id}`}
                            imageSrc={item.itemImageLink}
                            imageAlt={details?.itemName || 'Product'}
                            name={details?.itemName || 'Unnamed Product'}
                            price={convertedPrice}
                            originalPrice={convertedOriginalPrice ?? undefined}
                            currency={currencyCode}
                            inStock={inStock}
                            viewMode={viewMode}
                            badge={badge}
                            stockBadge={stockBadge}
                            brand={item.brand?.name || item.brandName || undefined}
                            warehouseLabel={warehouseLabel}
                            warehouseExtraLabel={warehouseExtraLabel}
                            description={viewMode === 'list' ? details?.description || undefined : undefined}
                            onAddToCart={addToCartHandler}
                            addToCartDisabled={!inStock}
                            addToCartLabel={inStock ? t('buy') : t('outOfStock')}
                          />
                        );
                      })}
                    </div>         
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
