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

  const fetchData = async () => {
    try {
      setIsDataLoading(true);
      const [itemsRes, brandsRes] = await Promise.all([
        fetch(`/api/public/items/${locale}`),
        fetch(`/api/public/brands`),
      ]);

      if (itemsRes.ok) {
        const itemsData = (await itemsRes.json()) as Item[];
        setItems(itemsData);
      }

      if (brandsRes.ok) {
        const brandsData = (await brandsRes.json()) as Array<{
          alias: string;
          name: string;
          imageLink: string;
        }>;
        setBrands(
          brandsData.map((b) => ({ id: b.alias, name: b.name, logo: b.imageLink }))
        );
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
          <Carousel position="home_top" banners={t.raw("banners")} />

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
