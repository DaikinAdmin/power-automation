import { useTranslations } from "next-intl";
import { ItemResponse } from "@/helpers/types/api-responses";
import CatalogProductCard from "@/components/catalog-product-card";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";
import { useCurrency } from "@/hooks/useCurrency";
import { calculateDiscountPercentage } from "@/helpers/pricing";
import { useCart } from "@/components/cart-context";
import { useCompare } from "@/components/compare-context";
import useEmblaCarousel from "embla-carousel-react";
import React, { useEffect, useRef } from "react";

type ProductsTabsSectionProps = {
  items: ItemResponse[];
  isDataLoading: boolean;
  activeTab: "bestsellers" | "discount" | "new";
  onTabChange: (tab: "bestsellers" | "discount" | "new") => void;
};

export default function ProductsTabsSection({
  items,
  isDataLoading,
  activeTab,
  onTabChange,
}: ProductsTabsSectionProps) {
  const t = useTranslations("home");
  const { addToCart } = useCart();
  const { addToCompare, isInCompare } = useCompare();
  const { getItemDetails, getItemPrice, getAvailableWarehouses } =
    useCatalogPricing({
      preferredCountryCode: "PL",
    });
  const { convertPrice, currencyCode } = useCurrency();

  // Get products by category
  const getProductsByCategory = (
    category: "bestsellers" | "discount" | "new"
  ) => {
    const displayedItems = items.filter((item) => item.isDisplayed);

    switch (category) {
      case "bestsellers":
        return displayedItems
          .filter((item) => item.sellCounter && item.sellCounter >= 0)
          .sort((a, b) => (b.sellCounter || 0) - (a.sellCounter || 0))
          .slice(0, 8);
      case "discount":
        const today = new Date();
        return displayedItems
          .filter((item) => {
            // Check if item has DISCOUNT badge
            const hasDiscountBadge = item.prices.some(
              (price) => price.badge === "HOT_DEALS"
            );

            // Check if item has active promotion price
            const hasActivePromotion = item.prices.some(
              (price: {
                promotionPrice: number | null;
                price: number;
                promoEndDate: string | number | Date | null;
              }) => {
                if (
                  !price.promotionPrice ||
                  price.promotionPrice >= price.price
                )
                  return false;

                // Check if promotion is active today
                if (price.promoEndDate) {
                  const startDate = new Date();
                  const endDate = new Date(price.promoEndDate);
                  return today >= startDate && today <= endDate;
                }

                // If no date restrictions, consider promotion active
                return true;
              }
            );

            return hasDiscountBadge || hasActivePromotion;
          })
          .slice(0, 6);
      case "new":
        return displayedItems
          .filter((item) =>
            item.prices.some((price) => price.badge === "NEW_ARRIVALS")
          )
          .slice(0, 4);
      default:
        return [];
    }
  };

  // Embla for mobile carousel
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    align: "start",
    breakpoints: {
      "(min-width: 768px)": { dragFree: false },
    },
  });

  const products = getProductsByCategory(activeTab);

  return (
    <section className="max-w-[90rem] mx-auto px-2 sm:px-4 my-2">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-8 gap-2">
        <button
          onClick={() => onTabChange("bestsellers")}
          className={`relative px-2 md:px-6 py-3 text-tabs-title-mobile md:text-tabs-title transition-colors
      after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-accent
      after:origin-center after:transition-transform after:duration-300
      ${
        activeTab === "bestsellers"
          ? "text-accent after:scale-x-100"
          : "text-primary-gray md:text-black hover:text-opacity-60 after:scale-x-0"
      }`}
        >
          {t("tabs.bestsellers")}
        </button>

        <button
          onClick={() => onTabChange("discount")}
          className={`relative px-2 md:px-6 py-3 text-tabs-title-mobile md:text-tabs-title transition-colors
      after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-accent
      after:origin-center after:transition-transform after:duration-300
      ${
        activeTab === "discount"
          ? "text-accent after:scale-x-100"
          : "text-primary-gray md:text-black hover:text-opacity-60 after:scale-x-0"
      }`}
        >
          {t("tabs.discount")}
        </button>

        <button
          onClick={() => onTabChange("new")}
          className={`relative px-2 md:px-6 py-3 text-tabs-title-mobile md:text-tabs-title transition-colors
      after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:bg-accent
      after:origin-center after:transition-transform after:duration-300
      ${
        activeTab === "new"
          ? "text-accent after:scale-x-100"
          : "text-primary-gray md:text-black hover:text-opacity-60 after:scale-x-0"
      }`}
        >
          {t("tabs.new")}
        </button>
      </div>

      {/* Products Grid or Carousel */}
      {isDataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-1 gap-3 md:grid-cols-6">
            {products.map((item) => {
              const details = getItemDetails(item);
              const { price, originalPrice, inStock, displayedName } =
                getItemPrice(item);
              const convertedPrice = convertPrice(price);
              const convertedOriginalPrice =
                originalPrice != null ? convertPrice(originalPrice) : null;
              const warehouseLabel = displayedName
                ? `From ${displayedName}`
                : undefined;

              const badge = (() => {
                if (activeTab === "bestsellers") {
                  return {
                    text: t("badges.bestseller"),
                    className: "bg-yellow-500 text-white",
                  };
                }
                if (activeTab === "discount") {
                  const label = originalPrice
                    ? `${t("badges.discount")} -${calculateDiscountPercentage(
                        originalPrice,
                        price
                      )}%`
                    : t("badges.discount");
                  return {
                    text: label,
                    className: "bg-red-500 text-white",
                  };
                }
                return {
                  text: t("badges.new"),
                  className: "bg-green-500 text-white",
                };
              })();

              const addToCartHandler = () => {
                if (!inStock) return;
                const { warehouseId } = getItemPrice(item);
                const subCategory = item.subCategorySlug
                  ? item.category.subCategories.find(
                      (s) => s.slug === item.subCategorySlug
                    )
                  : null;
                addToCart({
                  id: `${item.articleId}-${warehouseId}`,
                  slug: item.articleId,
                  alias: null,
                  availableWarehouses: getAvailableWarehouses(item),
                  articleId: item.articleId,
                  isDisplayed: item.isDisplayed,
                  sellCounter: item.sellCounter,
                  itemImageLink: item.itemImageLink,
                  categorySlug: item.categorySlug,
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                  itemPrice: item.prices as any,
                  itemDetails: [item.details as any],
                  category: {
                    ...item.category,
                    id: item.category.slug,
                    categoryTranslations: [],
                  } as any,
                  subCategory: subCategory
                    ? ({ ...subCategory, id: subCategory.slug } as any)
                    : null,
                  warrantyType: item.warrantyType || 'manufacturer',
                  warrantyLength: item.warrantyLength || 12,
                  brandSlug: item.brandSlug,
                  brand: item.brand
                    ? ({ ...item.brand, id: item.brand.alias } as any)
                    : null,
                  linkedItems: [],
                });
              };

              const addToCompareHandler = () => {
                const compareItem = {
                  id: item.articleId, // використовуємо articleId як унікальний ідентифікатор
                  articleId: item.articleId,
                  name: details?.itemName || "Unnamed Product",
                  brand: item.brand?.name,
                  brandImage: item.brand?.imageLink,
                  image: item.itemImageLink?.[0] || null,
                  price: price,
                  specialPrice: originalPrice ? price : null,
                  description: details?.description,
                  categorySlug: item.categorySlug,
                };
                addToCompare(compareItem);
              };

              return (
                <CatalogProductCard
                  key={item.articleId}
                  href={`/product/${item.articleId}`}
                  imageSrc={item.itemImageLink}
                  imageAlt={details?.itemName || "Product"}
                  name={details?.itemName || "Unnamed Product"}
                  price={convertedPrice}
                  originalPrice={convertedOriginalPrice ?? undefined}
                  currency={currencyCode}
                  inStock={inStock}
                  badge={badge}
                  warehouseLabel={warehouseLabel}
                  onAddToCart={addToCartHandler}
                  onAddToCompare={addToCompareHandler}
                  addToCartDisabled={!inStock}
                  itemId={item.articleId}
                  isInCompare={isInCompare(item.articleId)}
                />
              );
            })}
            {products.length === 0 && (
              <div className="col-span-4 text-center py-8 text-gray-500">
                {t("messages.noProducts")}
              </div>
            )}
          </div>
          {/* Mobile carousel */}
          <div className="md:hidden">
            <div className="embla overflow-x-auto" ref={emblaRef}>
              <div className="embla__container flex gap-3">
                {products.map((item) => {
                  const details = getItemDetails(item);
                  const { price, originalPrice, inStock, displayedName } =
                    getItemPrice(item);
                  const convertedPrice = convertPrice(price);
                  const convertedOriginalPrice =
                    originalPrice != null ? convertPrice(originalPrice) : null;
                  const warehouseLabel = displayedName
                    ? `From ${displayedName}`
                    : undefined;

                  const badge = (() => {
                    if (activeTab === "bestsellers") {
                      return {
                        text: t("badges.bestseller"),
                        className: "bg-yellow-500 text-white",
                      };
                    }
                    if (activeTab === "discount") {
                      const label = originalPrice
                        ? `${t(
                            "badges.discount"
                          )} -${calculateDiscountPercentage(
                            originalPrice,
                            price
                          )}%`
                        : t("badges.discount");
                      return {
                        text: label,
                        className: "bg-red-500 text-white",
                      };
                    }
                    return {
                      text: t("badges.new"),
                      className: "bg-green-500 text-white",
                    };
                  })();

                  const addToCartHandler = () => {
                    if (!inStock) return;
                    const { warehouseId } = getItemPrice(item);
                    const subCategory = item.subCategorySlug
                      ? item.category.subCategories.find(
                          (s) => s.slug === item.subCategorySlug
                        )
                      : null;
                    addToCart({
                      id: `${item.articleId}-${warehouseId}`,
                      slug: item.articleId,
                      alias: null,
                      availableWarehouses: getAvailableWarehouses(item),
                      articleId: item.articleId,
                      isDisplayed: item.isDisplayed,
                      sellCounter: item.sellCounter,
                      itemImageLink: item.itemImageLink,
                      categorySlug: item.categorySlug,
                      createdAt: item.createdAt,
                      updatedAt: item.updatedAt,
                      itemPrice: item.prices as any,
                      itemDetails: [item.details as any],
                      category: {
                        ...item.category,
                        id: item.category.slug,
                        categoryTranslations: [],
                      } as any,
                      subCategory: subCategory
                        ? ({ ...subCategory, id: subCategory.slug } as any)
                        : null,
                      warrantyType: item.warrantyType || 'manufacturer',
                      warrantyLength: item.warrantyLength || 12,
                      brandSlug: item.brandSlug,
                      brand: item.brand
                        ? ({ ...item.brand, id: item.brand.alias } as any)
                        : null,
                      linkedItems: [],
                    });
                  };

                  const addToCompareHandler = () => {
                    const compareItem = {
                      id: item.articleId, // використовуємо articleId як унікальний ідентифікатор
                      articleId: item.articleId,
                      name: details?.itemName || "Unnamed Product",
                      brand: item.brand?.name,
                      brandImage: item.brand?.imageLink,
                      image: item.itemImageLink?.[0] || null,
                      price: price,
                      specialPrice: originalPrice ? price : null,
                      description: details?.description,
                      categorySlug: item.categorySlug,
                    };
                    addToCompare(compareItem);
                  };

                  return (
                    <div
                      key={item.articleId}
                      className="flex-[0_0_80vw] max-w-[40vw] md:max-w-[80vw]"
                    >
                      <CatalogProductCard
                        href={`/product/${item.articleId}`}
                        imageSrc={item.itemImageLink}
                        imageAlt={details?.itemName || "Product"}
                        name={details?.itemName || "Unnamed Product"}
                        price={convertedPrice}
                        originalPrice={convertedOriginalPrice ?? undefined}
                        currency={currencyCode}
                        inStock={inStock}
                        badge={badge}
                        warehouseLabel={warehouseLabel}
                        onAddToCart={addToCartHandler}
                        onAddToCompare={addToCompareHandler}
                        addToCartDisabled={!inStock}
                        itemId={item.articleId}
                        isInCompare={isInCompare(item.articleId)}
                      />
                    </div>
                  );
                })}
                {products.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    {t("messages.noProducts")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
