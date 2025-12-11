'use client';
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/components/cart-context";
import Link from "next/link";
import Image from "next/image";
import PageLayout from "@/components/layout/page-layout";
import { Item } from "@/helpers/types/item";
import { Badge } from "@prisma/client";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";
import { calculateDiscountPercentage } from "@/helpers/pricing";
import CatalogProductCard from "@/components/catalog-product-card";
import { useCurrency } from "@/hooks/useCurrency";
import { useLocale, useTranslations } from 'next-intl';

type CarouselSlide = {
  id: string;
  src: string;
  alt: string;
  href?: string;
  priority?: boolean;
};

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: "main",
    src: "/imgs/main_banner_amm.webp",
    alt: "Automation Main Banner",
    priority: true
  },
  {
    id: "siemens",
    src: "/imgs/siemens_main_banner_amm.webp",
    alt: "Siemens S5 Product Banner",
    href: "/categories/siemens-s5"
  },
  {
    id: "mobile",
    src: "/imgs/mobile_main_banner._amm.webp",
    alt: "Mobile Automation Banner",
    href: "/product/cmfxo7pxy0001pa9q5ta4kejp"
  }
];

const FEATURE_ITEMS = [
  {
    id: "payment",
    titleKey: "payment",
    imageSrc: "/imgs/feature/payment.webp",
    imageAlt: "Illustration representing payment on delivery",
  },
  {
    id: "refund",
    titleKey: "refund",
    imageSrc: "/imgs/feature/return-refund.webp",
    imageAlt: "Illustration representing refunding",
  },
  {
    id: "delivery",
    titleKey: "delivery",
    imageSrc: "/imgs/feature/delivery.webp",
    imageAlt: "Illustration representing fast delivery",
  },
  {
    id: "warranty",
    titleKey: "warranty",
    imageSrc: "/imgs/feature/warranty.webp",
    imageAlt: "Illustration representing product quality",
  },
  {
    id: "one-click",
    titleKey: "oneClick",
    imageSrc: "/imgs/feature/one-click.webp",
    imageAlt: "Illustration representing one-click buy",
  },
];

export default function Home() {
  const locale = useLocale();
  const t = useTranslations('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'bestsellers' | 'discount' | 'new'>('bestsellers');
  const { cartItems, addToCart, updateCartQuantity, removeFromCart, getTotalCartItems, isCartModalOpen, setIsCartModalOpen } = useCart();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; image: string; subcategories: string[] }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string; logo: string }[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const { getItemDetails, getItemPrice, getAvailableWarehouses } = useCatalogPricing({
    preferredCountryCode: "PL"
  });
  const { convertPrice, currencyCode } = useCurrency();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsDataLoading(true);
      const response = await fetch(`/api/public/items/${locale}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
        
        // Extract categories from items
        const categoryMap = new Map();
        const brandMap = new Map();
        
        data.forEach((item: Item) => {
          // Process categories
          if (item.category) {
            const categoryName = typeof item.category === 'object' ? item.category.name : item.category;
            const categorySlug = typeof item.category === 'object' ? item.category.slug : categoryName.toLowerCase().replace(/\s+/g, '-');

            if (!categoryMap.has(categoryName)) {
              categoryMap.set(categoryName, {
                id: categoryName.toLowerCase().replace(/\s+/g, '-'),
                name: categoryName,
                slug: categorySlug,
                image: "/placeholder-category.jpg",
                subcategories: new Set()
              });
            }
            if (item.subCategory) {
              const subCategoryName = typeof item.subCategory === 'object' ? item.subCategory.name : item.subCategory;
              categoryMap.get(categoryName).subcategories.add(subCategoryName);
            }
          }

          // Process brands
          const brandName = item.brand?.name || item.brandSlug;
          if (brandName && !brandMap.has(brandName)) {
            brandMap.set(brandName, {
              id: brandName.toLowerCase().replace(/\s+/g, '-'),
              name: brandName,
              logo: item.brand?.imageLink || "/placeholder-brand.jpg"
            });
          }
        });
        
        // Convert categories map to array
        const categoriesArray = Array.from(categoryMap.values()).map(cat => ({
          ...cat,
          subcategories: Array.from(cat.subcategories)
        }));
        setCategories(categoriesArray);
        
        // Convert brands map to array
        setBrands(Array.from(brandMap.values()));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  // Get products by category
  const getProductsByCategory = (category: 'bestsellers' | 'discount' | 'new') => {
    const displayedItems = items.filter(item => item.isDisplayed);
    
    switch (category) {
      case 'bestsellers':
        return displayedItems
          .filter(item => item.sellCounter && item.sellCounter >= 0)
          .sort((a, b) => (b.sellCounter || 0) - (a.sellCounter || 0))
          .slice(0, 8);
      case 'discount':
        const today = new Date();
        return displayedItems
          .filter(item => {
            // Check if item has DISCOUNT badge
            const hasDiscountBadge = item.itemPrice.some((price: { badge: Badge|null; }) => price.badge === Badge.HOT_DEALS);
            
            // Check if item has active promotion price
            const hasActivePromotion = item.itemPrice.some((price: { promotionPrice: number | null; price: number; promoEndDate: string | number | Date | null; }) => {
              if (!price.promotionPrice || price.promotionPrice >= price.price) return false;
              
              // Check if promotion is active today
              if (price.promoEndDate) {
                const startDate = new Date();
                const endDate = new Date(price.promoEndDate);
                return today >= startDate && today <= endDate;
              }
              
              // If no date restrictions, consider promotion active
              return true;
            });
            
            return hasDiscountBadge || hasActivePromotion;
          })
          .slice(0, 4);
      case 'new':
        return displayedItems
          .filter(item => 
            item.itemPrice.some((price: { badge: string | null; }) => price.badge === Badge.NEW_ARRIVALS)
          )
          .slice(0, 4);
      default:
        return [];
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main>
          {/* Carousel Section */}
          <div
            className="relative overflow-hidden"
            style={{ aspectRatio: "10 / 3" }}
          >
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
                 style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {CAROUSEL_SLIDES.map((slide) => {
                const imageElement = (
                  <div className="relative h-full w-full">
                    <Image
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      priority={slide.priority}
                      className="object-contain"
                      sizes="100vw"
                    />
                  </div>
                );

                return (
                  <div key={slide.id} className="flex h-full w-full flex-shrink-0">
                    {slide.href ? (
                      <Link href={slide.href} className="flex h-full w-full">
                        {imageElement}
                      </Link>
                    ) : (
                      imageElement
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-full">
              <ChevronLeft size={24} className="text-white" />
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 p-2 rounded-full">
              <ChevronRight size={24} className="text-white" />
            </button>
          </div>
          
          {/* Features Section */}
          <section className="grid grid-cols-1 bg-white sm:grid-cols-1 lg:grid-cols-5">
            {FEATURE_ITEMS.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between gap-6 px-6 py-8">
                <Image
                  src={feature.imageSrc}
                  alt={feature.imageAlt}
                  width={96}
                  height={96}
                  className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 35vw, 60vw"
                />
                <div className="flex-1 text-right">
                  <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                    {t(`features.${feature.titleKey}`)}
                  </h3>
                </div>
              </div>
            ))}
          </section>

          {/* Products Section with Tabs */}
          <div className="container mx-auto mt-12 mb-12">
            {/* Tab Navigation */}
            <div className="flex justify-center border-b mb-8">
              <button
                onClick={() => setActiveTab('bestsellers')}
                className={`px-6 py-3 font-semibold ${activeTab === 'bestsellers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                {t('tabs.bestsellers')}
              </button>
              <button
                onClick={() => setActiveTab('discount')}
                className={`px-6 py-3 font-semibold ${activeTab === 'discount' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                {t('tabs.discount')}
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-3 font-semibold ${activeTab === 'new' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                {t('tabs.new')}
              </button>
            </div>

            {/* Products Grid */}
            {isDataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {getProductsByCategory(activeTab).map((item) => {
                  const details = getItemDetails(item);
                  const { price, originalPrice, inStock, displayedName } = getItemPrice(item);
                  const convertedPrice = convertPrice(price);
                  const convertedOriginalPrice = originalPrice != null ? convertPrice(originalPrice) : null;
                  const warehouseLabel = displayedName
                    ? `From ${displayedName}`
                    : undefined;

                  const badge = (() => {
                    if (activeTab === 'bestsellers') {
                      return { text: t('badges.bestseller'), className: 'bg-yellow-500 text-white' };
                    }

                    if (activeTab === 'discount') {
                      const label = originalPrice
                        ? `${t('badges.discount')} -${calculateDiscountPercentage(originalPrice, price)}%`
                        : t('badges.discount');
                      return { text: label, className: 'bg-red-500 text-white' };
                    }

                    return { text: t('badges.new'), className: 'bg-green-500 text-white' };
                  })();

                  const addToCartHandler = () => {
                    if (!inStock) {
                      return;
                    }

                    addToCart({
                      id: item.id,
                      availableWarehouses: getAvailableWarehouses(item),
                      articleId: item.articleId,
                      isDisplayed: item.isDisplayed,
                      sellCounter: item.sellCounter,
                      itemImageLink: item.itemImageLink,
                      categorySlug: item.categorySlug,
                      subCategorySlug: item.subCategorySlug,
                      createdAt: item.createdAt,
                      updatedAt: item.updatedAt,
                      itemPrice: item.itemPrice,
                      itemDetails: item.itemDetails,
                      category: item.category,
                      subCategory: item.subCategory,
                      warrantyType: item.warrantyType,
                      warrantyLength: item.warrantyLength,
                      brandSlug: item.brandSlug
                    });
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
                      badge={badge}
                      warehouseLabel={warehouseLabel}
                      onAddToCart={addToCartHandler}
                      addToCartDisabled={!inStock}
                    />
                  );
                })}
                {getProductsByCategory(activeTab).length === 0 && (
                  <div className="col-span-4 text-center py-8 text-gray-500">
                    {t('messages.noProducts')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div className="container mx-auto mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">{t('sections.categories')}</h2>
            {isDataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6">
                {categories.map((category) => (
                  <Link key={category.id} href={`/category/${category.slug}`} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer">
                    {/* Category Image */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                      <img 
                        src={category.image} 
                        alt={category.name} 
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    
                    {/* Category Info */}
                    <div className="p-4 text-center">
                      <h2 className="font-bold text-lg mb-3 text-gray-800">{category.name}</h2>
                      
                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.length > 0 && (
                        <div className="space-y-1">
                          {category.subcategories.slice(0, 3).map((subcategory, index) => (
                            <h3 
                              key={index} 
                              className="text-sm text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {subcategory}
                            </h3>
                          ))}
                          {category.subcategories.length > 3 && (
                            <h3 className="text-sm text-gray-500">
                              {t('messages.moreSubcategories', { count: category.subcategories.length - 3 })}
                            </h3>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
                {categories.length === 0 && (
                  <div className="col-span-6 text-center py-8 text-gray-500">
                    {t('messages.noCategories')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Brands Section */}
          <div className="container mx-auto mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">{t('sections.brands')}</h2>
            {isDataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6">
                {[...Array(10)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6">
                {brands.slice(0, 10).map((brand) => (
                  <div key={brand.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer">
                    {/* Brand Logo */}
                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-8">
                      <img 
                        src={brand.logo} 
                        alt={brand.name} 
                        className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                  </div>
                ))}
                {brands.length === 0 && (
                  <div className="col-span-6 text-center py-8 text-gray-500">
                    {t('messages.noBrands')}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
