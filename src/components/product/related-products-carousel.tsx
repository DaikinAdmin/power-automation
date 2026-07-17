"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import useEmblaCarousel from "embla-carousel-react";

import CatalogProductCard from "@/components/catalog-product-card";
import { useCatalogPricing } from "@/hooks/useCatalogPricing";
import { useCurrency } from "@/hooks/useCurrency";
import { useCart } from "@/components/cart-context";
import { useCompare } from "@/components/compare-context";
import type { ItemResponse } from "@/helpers/types/api-responses";
import type { SupportedCurrency } from "@/helpers/currency";

interface RelatedProductsCarouselProps {
  slug: string;
  locale: string;
}

export function RelatedProductsCarousel({
  slug,
  locale,
}: RelatedProductsCarouselProps) {
  const t = useTranslations("product");
  const { addToCart } = useCart();
  const { addToCompare, isInCompare } = useCompare();
  const { getItemDetails, getItemPrice, getMinPrice, getAvailableWarehouses } =
    useCatalogPricing({ preferredCountryCode: "PL" });
  const { convertFromCurrency, currencyCode } = useCurrency();

  const [items, setItems] = useState<ItemResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    let cancelled = false;

    const fetchRelated = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/public/items/${locale}/${slug}/related`,
        );
        if (!response.ok) throw new Error("Failed to fetch related items");
        const data: { items: ItemResponse[] } = await response.json();
        if (!cancelled) setItems(data.items || []);
      } catch (error) {
        console.error("Error fetching related products:", error);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRelated();
    return () => {
      cancelled = true;
    };
  }, [slug, locale]);

  if (loading || items.length === 0) return null;

  return (
    <section className="max-w-[90rem] mx-auto px-2 sm:px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-product-title text-xl font-semibold">
          {t("relatedProducts.title")}
        </h2>
        <div className="hidden sm:flex gap-2">
          <button
            onClick={scrollPrev}
            className="p-2 rounded-full border border-gray-200 hover:border-accent hover:text-accent transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={scrollNext}
            className="p-2 rounded-full border border-gray-200 hover:border-accent hover:text-accent transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="embla overflow-x-clip" ref={emblaRef}>
        <div className="embla__container flex gap-3 items-stretch">
          {items.map((item) => {
            const details = getItemDetails(item);
            const {
              price,
              originalPrice,
              inStock,
              displayedName,
              initialCurrency: itemCurrency,
            } = getItemPrice(item);
            const fromCurrency =
              (itemCurrency as SupportedCurrency) ?? "EUR";
            const { price: minPrice, initialCurrency: minCurrency } =
              getMinPrice(item);
            const convertedMinPrice = convertFromCurrency(
              minPrice,
              (minCurrency as SupportedCurrency) ?? "EUR",
            );
            const convertedOriginalPrice =
              originalPrice != null
                ? convertFromCurrency(originalPrice, fromCurrency)
                : null;
            const warehouseLabel = displayedName ?? undefined;

            const addToCartHandler = () => {
              if (!inStock) return;
              const {
                warehouseId,
                price: itemPrice,
                originalPrice: itemOriginalPrice,
                initialCurrency: warehouseCurrency,
              } = getItemPrice(item);
              const subCategory = item.subCategorySlug
                ? item.category.subCategories.find(
                    (s) => s.slug === item.subCategorySlug,
                  )
                : null;
              addToCart({
                id: `${item.slug}-${warehouseId}`,
                slug: item.slug,
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
                warrantyType: item.warrantyType || "manufacturer",
                warrantyLength: item.warrantyLength || 12,
                brandSlug: item.brandSlug,
                brand: item.brand
                  ? ({ ...item.brand, id: item.brand.alias } as any)
                  : null,
                linkedItems: [],
                price: itemPrice,
                basePrice: itemOriginalPrice ?? itemPrice,
                specialPrice: itemOriginalPrice ? itemPrice : undefined,
                baseSpecialPrice: itemOriginalPrice ? itemPrice : undefined,
                warehouseId,
                initialCurrency: warehouseCurrency ?? null,
                grossWeight: item.grossWeight,
                heightPacking: item.heightPacking,
                widthPacking: item.widthPacking,
                lengthPacking: item.lengthPacking,
              });
            };

            const addToCompareHandler = () => {
              addToCompare({
                id: item.slug,
                articleId: item.articleId,
                slug: item.slug,
                name: details?.itemName || "Unnamed Product",
                brand: item.brand?.name,
                brandImage: item.brand?.imageLink,
                image: item.itemImageLink?.[0] || null,
                price,
                specialPrice: originalPrice ? price : null,
                description: details?.description,
                categorySlug: item.categorySlug,
              });
            };

            return (
              <div
                key={item.slug}
                className="flex-[0_0_75%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_23%] xl:flex-[0_0_19%]"
              >
                <CatalogProductCard
                  href={`/product/${item.slug}`}
                  imageSrc={item.itemImageLink}
                  imageAlt={details?.itemName || "Product"}
                  name={details?.itemName || "Unnamed Product"}
                  price={convertedMinPrice}
                  originalPrice={convertedOriginalPrice ?? undefined}
                  currency={currencyCode}
                  inStock={inStock}
                  warehouseLabel={warehouseLabel}
                  onAddToCart={addToCartHandler}
                  onAddToCompare={addToCompareHandler}
                  addToCartDisabled={!inStock}
                  itemId={item.slug}
                  isInCompare={isInCompare(item.slug)}
                  priceFrom={true}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RelatedProductsCarousel;
