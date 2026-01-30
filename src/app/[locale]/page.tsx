"use client";
import { useState } from "react";
import PageLayout from "@/components/layout/page-layout";
import Carousel from "@/components/banner-carousel";
import { useLocale, useTranslations } from "next-intl";
import BrandsCarousel from "@/components/home/brands-carousel";
import { useCategories } from "@/hooks/useCategories";
import { usePublicItems } from "@/hooks/usePublicItems";
import { usePublicBrands } from "@/hooks/usePublicBrands";
import FeaturesSection from "@/components/home/features-section";
import ProductsTabsSection from "@/components/home/products-tabs-section";
import CategoriesSection from "@/components/home/categories-section";

export default function Home() {
  const locale = useLocale();
  const t = useTranslations("home");
  const [activeTab, setActiveTab] = useState<
    "bestsellers" | "discount" | "new"
  >("bestsellers");

  // Use custom hooks for data fetching
  const { items, isLoading: isItemsLoading } = usePublicItems({ locale });
  const { brands: brandsData, isLoading: isBrandsLoading } = usePublicBrands();
  const { categories, isLoading: isCategoriesLoading } = useCategories(locale);

  // Transform brands data for BrandsCarousel component
  const brands = brandsData.map(b => ({
    id: b.alias,
    name: b.name,
    logo: b.imageLink,
  }));

  const isDataLoading = isItemsLoading || isBrandsLoading;

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
