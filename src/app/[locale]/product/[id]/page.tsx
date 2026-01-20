"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import PageLayout from "@/components/layout/page-layout";
import WarehouseSelector from "@/components/warehouse-selector";
import { ProductImageViewer } from "@/components/product/product-image-viewer";
import { ProductInfoTabs } from "@/components/product/product-info-tabs";
import { ProductHeader } from "@/components/product/product-header";
import { ProductPriceCard } from "@/components/product/product-price-card";
import { ProductDetailsCard } from "@/components/product/product-details-card";
import { ProductOpinionForm } from "@/components/product/product-opinion-form";
import { AskPriceModal } from "@/components/product/ask-price-modal";
import { calculateDiscountPercentage } from "@/helpers/pricing";
import { useCurrency } from "@/hooks/useCurrency";
import { useCart } from "@/components/cart-context";
import { useCompare } from "@/components/compare-context";
import type {
  CartItemType,
  ProductDetailsResponse,
  ProductWarehouse,
} from "@/helpers/types/item";

type SelectorWarehouse = Omit<ProductWarehouse, "specialPrice"> & {
  id: string;
  specialPrice?: string;
  basePrice: number;
  baseSpecialPrice?: number;
};

const parsePriceValue = (value?: string | null): number | null => {
  if (!value) return null;
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = use(params);
  const searchParams = useSearchParams();
  const showAskPrice = searchParams.get("askPrice") === "true";
  const { formatPriceFromBase } = useCurrency();
  const { addToCart } = useCart();
  const { addToCompare, isInCompare } = useCompare();
  const t = useTranslations("product");

  const [product, setProduct] = useState<ProductDetailsResponse | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAskPriceModal, setShowAskPriceModal] = useState(false);
  const [askPriceForm, setAskPriceForm] = useState({
    warehouseId: "",
    quantity: 1,
    comment: "",
  });
  const [isSubmittingPriceRequest, setIsSubmittingPriceRequest] =
    useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/items/${locale}/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch product: ${response.status}`);
        }

        const data: ProductDetailsResponse = await response.json();
        setProduct(data);

        const recommended = data.recommendedWarehouse?.warehouse
          ? data.warehouses.find(
              (w) => w.warehouseId === data.recommendedWarehouse?.warehouse.id
            )
          : data.warehouses[0];
        setSelectedWarehouseId(recommended?.warehouseId ?? null);
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct().catch(() => undefined);
  }, [id]);

  const availableWarehousesForCart = useMemo(() => {
    if (!product) return [];
    return product.warehouses.map((warehouse) => {
      return {
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.warehouseName,
        warehouseCountry: warehouse.warehouseCountry,
        displayName: warehouse.displayedName,
        price: parsePriceValue(warehouse.price)!,
        specialPrice: parsePriceValue(warehouse.specialPrice)!,
        inStock: warehouse.inStock,
        quantity: warehouse.quantity,
      };
    });
  }, [product]);

  const selectorWarehouses = useMemo<SelectorWarehouse[]>(() => {
    if (!product) return [];
    return product.warehouses.map((warehouse, index) => {
      const basePrice = parsePriceValue(warehouse.price) ?? 0;
      const baseSpecialPrice = warehouse.specialPrice
        ? parsePriceValue(warehouse.specialPrice) ?? undefined
        : undefined;

      return {
        id: `${product.id}-${warehouse.warehouseId}-${index}`,
        ...warehouse,
        price: formatPriceFromBase(basePrice),
        specialPrice:
          baseSpecialPrice !== undefined
            ? formatPriceFromBase(baseSpecialPrice)
            : undefined,
        basePrice,
        baseSpecialPrice,
      };
    });
  }, [product, formatPriceFromBase]);

  useEffect(() => {
    if (showAskPrice) {
      setShowAskPriceModal(true);
    }
  }, [showAskPrice]);

  useEffect(() => {
    if (!product) return;
    const defaultWarehouse = product.recommendedWarehouse?.warehouse
      ? product.warehouses.find(
          (w) => w.warehouseId === product.recommendedWarehouse?.warehouse.id
        )
      : product.warehouses[0];
    setSelectedWarehouseId(
      (prev) => prev ?? defaultWarehouse?.warehouseId ?? null
    );
    // Set default warehouse for ask price form
    setAskPriceForm((prev) => ({
      ...prev,
      warehouseId: prev.warehouseId || defaultWarehouse?.warehouseId || "",
    }));
  }, [product]);

  const selectedWarehouse = useMemo(() => {
    if (!selectorWarehouses.length) return null;
    const found = selectorWarehouses.find(
      (warehouse) => warehouse.warehouseId === selectedWarehouseId
    );
    return found ?? selectorWarehouses[0];
  }, [selectorWarehouses, selectedWarehouseId]);

  const resolvedDetail = useMemo(() => {
    if (!product) return null;
    const details = product.itemDetails || [];
    return (
      details.find((detail) => detail.locale === locale) || details[0] || null
    );
  }, [product, locale]);

  const productName =
    resolvedDetail?.itemName || product?.name || "Unnamed Product";
  const resolvedDetailLocale = resolvedDetail?.locale || locale;

  useEffect(() => {
    if (productName) {
      document.title = `${productName} | Power Automation`;
    }
  }, [productName]);

  const handleOpinionSubmit = (data: {
    name: string;
    email: string;
    opinion: string;
  }) => {
    console.log("Opinion submitted:", data);
    // Here you would typically send the data to your API
  };

  const handleAddToCart = () => {
    if (isAddingToCart || !product || !selectedWarehouse) {
      return;
    }

    setIsAddingToCart(true);

    try {
      if (selectedWarehouse.inStock) {
        const basePrice =
          selectedWarehouse.basePrice ??
          parsePriceValue(selectedWarehouse.price) ??
          0;
        const baseSpecialPrice =
          selectedWarehouse.baseSpecialPrice ??
          (selectedWarehouse.specialPrice
            ? parsePriceValue(selectedWarehouse.specialPrice) ?? undefined
            : undefined);
        const specialPrice = baseSpecialPrice;

        const now = new Date().toISOString();

        const cartItem: Omit<CartItemType, "quantity"> = {
          id: product.id,
          slug: product.articleId,
          articleId: product.articleId,
          isDisplayed: product.isDisplayed,
          itemImageLink: product.itemImageLink || [product.image] || [],
          categorySlug: product.categorySlug,
          brandSlug: product.brandSlug ?? null,
          warrantyType: product.warrantyType ?? null,
          warrantyLength: product.warrantyMonths ?? null,
          sellCounter: product.sellCounter ?? 0,
          createdAt: now,
          updatedAt: now,
          category: {
            id: product.categorySlug,
            name: product.category,
            slug: product.categorySlug,
            imageLink: null,
            isVisible: true,
            createdAt: now,
            updatedAt: now,
            subCategories: [],
            categoryTranslations: [],
          },
          subCategory: {
            id: product.subCategorySlug,
            name: product.subcategory,
            slug: `${product.categorySlug}-${product.subcategory
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`,
            categorySlug: product.categorySlug,
            isVisible: true,
            createdAt: now,
            updatedAt: now,
          },
          brand: product.brandSlug
            ? {
                id: "",
                name: product.brand,
                alias: product.brandAlias || "",
                imageLink: product.brandImage || "",
                isVisible: true,
                createdAt: now,
                updatedAt: now,
              }
            : null,
          itemDetails: [
            {
              id: "",
              itemSlug: product.articleId,
              locale: resolvedDetailLocale,
              itemName: productName,
              description: product.description,
              specifications: resolvedDetail?.specifications ?? "",
              seller: resolvedDetail?.seller ?? "",
              discount: resolvedDetail?.discount ?? null,
              popularity: resolvedDetail?.popularity ?? null,
              metaKeyWords: resolvedDetail?.metaKeyWords || null,
              metaDescription: resolvedDetail?.metaDescription || null,
            },
          ],
          itemPrice: [],
          price: specialPrice ?? basePrice,
          specialPrice,
          basePrice,
          warehouseId: selectedWarehouse.warehouseId,
          displayName: productName,
          availableWarehouses: availableWarehousesForCart,
          linkedItems: [],
        };

        addToCart(cartItem);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setTimeout(() => setIsAddingToCart(false), 400);
    }
  };

  const handleAskForPrice = async () => {
    if (!product || !askPriceForm.warehouseId || isSubmittingPriceRequest) {
      return;
    }

    setIsSubmittingPriceRequest(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: product.id,
          warehouseId: askPriceForm.warehouseId,
          quantity: askPriceForm.quantity,
          comment: askPriceForm.comment,
          price: 0,
          isPriceRequest: true,
          status: "ASK_FOR_PRICE",
        }),
      });

      if (response.ok) {
        setShowAskPriceModal(false);
        setAskPriceForm({ warehouseId: "", quantity: 1, comment: "" });
        // You might want to show a success message here
        alert(
          "Price request submitted successfully! We will contact you soon."
        );
      } else {
        throw new Error("Failed to submit price request");
      }
    } catch (error) {
      console.error("Error submitting price request:", error);
      alert("Failed to submit price request. Please try again.");
    } finally {
      setIsSubmittingPriceRequest(false);
    }
  };

  const handleAddToCompare = () => {
    if (!product || !selectedWarehouse) return;

    const basePriceNumber = selectedWarehouse.basePrice ?? 0;
    const specialPriceNumber = selectedWarehouse.baseSpecialPrice;

    const compareItem = {
      id: product.articleId, // використовуємо articleId як унікальний ідентифікатор
      articleId: product.articleId,
      name: productName,
      brand: product.brand,
      brandImage: product.brandImage,
      image: product.itemImageLink?.[0] || product.image,
      price: basePriceNumber,
      specialPrice: specialPriceNumber,
      description: product.description,
      categorySlug: product.categorySlug,
    };

    const success = addToCompare(compareItem);
    if (!success) {
      if (isInCompare(product.articleId)) {
        alert(t("compare.alreadyAdded"));
      } else {
        alert(t("compare.limitReached"));
      }
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">{t("loading")}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!product) {
    return (
      <PageLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-800">
              {t("notFound.title")}
            </h1>
            <p className="mb-6 text-gray-600">{t("notFound.description")}</p>
            <Link
              href="/"
              className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              {t("notFound.backToHome")}
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const warehouseLabel = selectedWarehouse
    ? t("from", { warehouse: selectedWarehouse.displayedName })
    : undefined;
  const warehouseExtraLabel =
    selectedWarehouse && product.warehouses.length > 1
      ? t("moreLocations", { count: product.warehouses.length - 1 })
      : undefined;

  const basePriceNumber = selectedWarehouse?.basePrice ?? 0;
  const specialPriceNumber = selectedWarehouse?.baseSpecialPrice;

  const formattedPrice = formatPriceFromBase(
    specialPriceNumber ?? basePriceNumber
  );
  const formattedOriginalPrice = specialPriceNumber
    ? formatPriceFromBase(basePriceNumber)
    : undefined;
  const discountLabel = specialPriceNumber
    ? calculateDiscountPercentage(basePriceNumber, specialPriceNumber)
    : null;

  return (
    <PageLayout>
      <main className="max-w-[90rem] mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <ProductImageViewer
              images={product.itemImageLink || []}
              productName={productName}
              badge={product.badge}
            />

            {selectorWarehouses.length > 0 && selectedWarehouse && (
              <WarehouseSelector
                warehouses={selectorWarehouses}
                selectedWarehouse={selectedWarehouse}
                onWarehouseChange={(warehouse) =>
                  setSelectedWarehouseId(warehouse.warehouseId)
                }
                itemId={product.id}
                itemName={productName}
              />
            )}

            <ProductInfoTabs warrantyMonths={product.warrantyMonths} />
          </div>

          <div className="space-y-6">
            <ProductHeader
              productName={productName}
              articleId={product.articleId}
            />

            {selectedWarehouse && (
              <ProductPriceCard
                formattedPrice={formattedPrice}
                formattedOriginalPrice={formattedOriginalPrice}
                discountLabel={discountLabel}
                badgeLabel={selectedWarehouse.badge}
                inStock={selectedWarehouse.inStock}
                quantity={selectedWarehouse.quantity}
                warehouseLabel={warehouseLabel}
                extraLabel={warehouseExtraLabel}
                onAddToCart={handleAddToCart}
                onAskPrice={() => setShowAskPriceModal(true)}
                onAddToCompare={handleAddToCompare}
                isAddingToCart={isAddingToCart}
                isInCompare={product ? isInCompare(product.articleId) : false}
              />
            )}

            <ProductDetailsCard
              description={product.description}
              brand={product.brand}
              warrantyMonths={product.warrantyMonths}
              category={product.category}
              subcategory={product.subcategory}
            />

            <ProductOpinionForm onSubmit={handleOpinionSubmit} />
          </div>
        </div>
      </main>

      <AskPriceModal
        isOpen={showAskPriceModal}
        onClose={() => setShowAskPriceModal(false)}
        productName={productName}
        warehouses={selectorWarehouses}
        formData={askPriceForm}
        onFormChange={(updates) =>
          setAskPriceForm((prev) => ({ ...prev, ...updates }))
        }
        onSubmit={handleAskForPrice}
        isSubmitting={isSubmittingPriceRequest}
      />
    </PageLayout>
  );
}
