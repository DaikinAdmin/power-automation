import CatalogProductCard from "@/components/catalog-product-card";
import { useCompare } from "@/components/compare-context";
import { useTranslations } from "next-intl";

interface ProductsGridProps {
  items: any[];
  viewMode: "grid" | "list";
  getItemDetails: (item: any) => any;
  getItemPrice: (item: any) => any;
  getAvailableWarehouses: (item: any) => any[];
  convertPrice: (price: number) => number;
  currencyCode: string;
  calculateDiscountPercentage: (original: number, current: number) => number;
  onAddToCart: (item: any, warehouseId: string, price: number) => void;
}

export function ProductsGrid({
  items,
  viewMode,
  getItemDetails,
  getItemPrice,
  getAvailableWarehouses,
  convertPrice,
  currencyCode,
  calculateDiscountPercentage,
  onAddToCart,
}: ProductsGridProps) {
  const t = useTranslations("categories");
  const { addToCompare, isInCompare } = useCompare();

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          {t("noResults")}
        </h3>
        <p className="text-gray-500">{t("adjustFilters")}</p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        viewMode === "grid"
          ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-1"
      }`}
    >
      {items.map((item) => {
        const details = getItemDetails(item);
        const {
          price,
          originalPrice,
          inStock,
          warehouseName,
          quantity,
          warehouseId,
          displayedName,
        } = getItemPrice(item);
        const convertedPrice = convertPrice(price);
        const convertedOriginalPrice =
          originalPrice != null ? convertPrice(originalPrice) : null;
        const hasMultipleWarehouses = item.prices.length > 1;

        const badge = originalPrice
          ? {
              text: `-${calculateDiscountPercentage(originalPrice, price)}%`,
              className: "bg-red-500 text-white",
            }
          : undefined;

        const stockBadge = {
          text: inStock ? `${quantity} ${t("inStock")}` : t("outOfStock"),
          className: inStock
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white",
        };

        const warehouseLabel = `${t("from")} ${
          displayedName || warehouseName || "Unknown Warehouse"
        }`;
        const warehouseExtraLabel = hasMultipleWarehouses
          ? `+${item.prices.length - 1} ${
              item.prices.length > 2 ? t("moreLocations") : t("moreLocation")
            }`
          : undefined;

        const addToCartHandler = () => {
          if (!inStock) return;
          onAddToCart(item, warehouseId, price);
        };

        const addToCompareHandler = () => {
          const compareItem = {
            id: item.articleId, // використовуємо articleId як унікальний ідентифікатор
            articleId: item.articleId,
            slug: item.slug,
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
            key={item.slug}
            href={`/product/${item.slug}`}
            imageSrc={item.itemImageLink}
            imageAlt={details?.itemName || "Product"}
            name={details?.itemName || "Unnamed Product"}
            price={convertedPrice}
            originalPrice={convertedOriginalPrice ?? undefined}
            currency={currencyCode}
            inStock={inStock}
            viewMode={viewMode}
            badge={badge}
            stockBadge={stockBadge}
            brand={item.brand?.name || undefined}
            warehouseLabel={warehouseLabel}
            warehouseExtraLabel={warehouseExtraLabel}
            description={
              viewMode === "list" ? details?.description || undefined : undefined
            }
            onAddToCart={addToCartHandler}
            onAddToCompare={addToCompareHandler}
            addToCartDisabled={!inStock}
            addToCartLabel={inStock ? t("buy") : t("outOfStock")}
            itemId={item.slug}
            isInCompare={isInCompare(item.slug)}
          />
        );
      })}
    </div>
  );
}
