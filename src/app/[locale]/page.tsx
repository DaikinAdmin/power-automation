"use client";
import { useState, useEffect } from "react";
import PageLayout from "@/components/layout/page-layout";
import Carousel from "@/components/banner-carousel";
import { ItemResponse } from "@/helpers/types/api-responses";
import { useLocale, useTranslations } from "next-intl";
import BrandsCarousel from "@/components/home/brands-carousel";
import { useCategories } from "@/hooks/useCategories";
import FeaturesSection from "@/components/home/features-section";
import ProductsTabsSection from "@/components/home/products-tabs-section";
import CategoriesSection from "@/components/home/categories-section";

type Item = ItemResponse;


export default function Home() {
  const locale = useLocale();
  const t = useTranslations("home");
  const [activeTab, setActiveTab] = useState<
    "bestsellers" | "discount" | "new"
  >("bestsellers");
  const [items, setItems] = useState<Item[]>([]);
  const [brands, setBrands] = useState<
    { id: string; name: string; logo: string }[]
  >([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Use the categories hook
  const { categories, isLoading: isCategoriesLoading } = useCategories(locale);
  
  useEffect(() => {
    console.log('🏠 Home page - Categories from hook:', categories);
    console.log('🏠 Home page - Is loading:', isCategoriesLoading);
  }, [categories, isCategoriesLoading]);
  

  const fetchData = async () => {
    try {
      setIsDataLoading(true);
      const response = await fetch(`/api/public/items/${locale}`);
      if (response.ok) {
        const data = (await response.json()) as Item[];
        setItems(data);

        // Extract brands from items
        const brandMap = new Map();

        data.forEach((item: Item) => {
          // Process brands
          const brandName = item.brand?.name || item.brandSlug;
          if (brandName && !brandMap.has(brandName)) {
            brandMap.set(brandName, {
              id: brandName.toLowerCase().replace(/\s+/g, "-"),
              name: brandName,
              logo: item.brand?.imageLink || "/placeholder-brand.jpg",
            });
          }
        });

        // Convert brands map to array
        setBrands(Array.from(brandMap.values()));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [locale]);

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Main Content */}
        <main>
          {/* Carousel Section */}
          <Carousel banners={t.raw("banners")} />

          <div className="hidden md:block">
            <FeaturesSection />
          </div>

          {/* Wrapper for Categories + Products to control order */}
          <div className="flex flex-col md:flex-col">
            {/* Categories Section */}
            <div className="order-1 md:order-2">
              <CategoriesSection
                categories={categories}
                isDataLoading={isCategoriesLoading}
              />
            </div>

            {/* Products Tabs Section */}
            <div className="order-2 md:order-1">
              <ProductsTabsSection
                items={items}
                isDataLoading={isDataLoading}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </div>

          {/* Brands Section */}
          <BrandsCarousel brands={brands} isDataLoading={isDataLoading} t={t} />
        </main>
      </div>
    </PageLayout>
  );
}
