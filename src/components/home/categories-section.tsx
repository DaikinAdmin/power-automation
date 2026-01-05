"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Category } from "@/hooks/useCategories";
import { X } from "lucide-react";
import { IoIosArrowDown } from "react-icons/io";
import { PiSquaresFour } from "react-icons/pi";
import { motion, AnimatePresence } from "framer-motion";
import Accordion from "@/components/ui/Accordion";
import { slideUp, slideDown, fadeInOut } from "@/lib/animations";

type CategoriesSectionProps = {
  categories: Category[];
  isDataLoading: boolean;
};

export default function CategoriesSection({
  categories,
  isDataLoading,
}: CategoriesSectionProps) {
  const t = useTranslations("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {/* Mobile: Button to show categories (above tabs, visible only on mobile) */}
      <div className="md:hidden max-w-[90rem] mx-auto px-4 sm:px-4 mt-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="w-full bg-primary-gray text-category-title-mobile text-white py-2 px-6 rounded-lg flex items-center justify-center gap-1 transition-colors"
        >
          <PiSquaresFour className="w-8 h-8" />
          {t("sections.categories")}
        </button>
      </div>

      {/* Mobile: Slide-up modal */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMobileMenuOpen ? "" : "pointer-events-none"
        }`}
      >
        <AnimatePresence mode="wait">
          {isMobileMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                {...fadeInOut}
                className="absolute inset-0 bg-black/50"
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Modal content */}
              <motion.div
                {...slideUp} // відкриття
                exit={slideDown} // закриття
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[90vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="relative flex items-center p-3 border-b">
                  <h2 className="flex-1 text-category-title-mobile text-gray-800 text-center">
                    {t("sections.categories")}
                  </h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors duration-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Categories list */}
                <div className="overflow-y-auto flex-1 p-3">
                  {isDataLoading ? (
                    <div className="space-y-4">
                      {[...Array(6)].map((_, index) => (
                        <div
                          key={index}
                          className="bg-gray-100 h-20 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="">
                      {categories.map((category) => {
                        const hasSubcategories =
                          category.subcategories &&
                          category.subcategories.length > 0;
                        if (!hasSubcategories) {
                          return (
                            <div
                              key={category.id}
                              className="flex items-center p-1"
                            >
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-8 h-8 object-cover rounded mr-3 flex-shrink-0"
                              />
                              <Link
                                href={`/category/${category.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-category-title-mobile flex-1"
                              >
                                {category.name}
                              </Link>
                            </div>
                          );
                        }

                        return (
                          <Accordion
                            key={category.id}
                            items={[
                              {
                                title: (isActive: boolean) => (
                                  <div className="flex items-center p-1 relative">
                                    <img
                                      src={category.image}
                                      alt={category.name}
                                      className="w-8 h-8 object-cover rounded mr-3 flex-shrink-0"
                                    />
                                    <div className="text-category-title-mobile flex-1">
                                      {category.name}
                                    </div>
                                    <span className="ml-2 p-2 flex items-center justify-center">
                                      <IoIosArrowDown
                                        className={`w-5 h-5 transition-transform duration-200 ${
                                          isActive ? "rotate-180" : "rotate-0"
                                        }`}
                                      />
                                    </span>
                                  </div>
                                ),
                                content: (
                                  <div className="pl-12 pb-2">
                                    <Link
                                      href={`/category/${category.slug}`}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="block py-2 px-2 text-sm text-red-600 font-semibold"
                                    >
                                      Дивитись усі
                                    </Link>
                                    {category.subcategories!.map((sub) => (
                                      <Link
                                        key={sub.slug}
                                        href={`/category/${category.slug}?subcategory=${sub.slug}`}
                                        onClick={() =>
                                          setIsMobileMenuOpen(false)
                                        }
                                        className="block py-2 px-2 text-sm"
                                      >
                                        {sub.name}
                                      </Link>
                                    ))}
                                  </div>
                                ),
                              },
                            ]}
                            multiple={false}
                            defaultIndex={-1}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: Traditional grid (below tabs, visible only on desktop) */}
      <section className="bg-white w-full hidden md:block">
        <div className="max-w-[90rem] mx-auto px-2 sm:px-4 mb-12 py-6">
          <h2 className="text-tabs-title font-bold text-center text-gray-800 mb-6">
            {t("sections.categories")}
          </h2>
          {isDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-6">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse"
                >
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
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-x-12">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="overflow-hidden cursor-pointer"
                >
                  {/* Category Image */}
                  <Link
                    className="aspect-square  flex items-center justify-center p-4"
                    href={`/category/${category.slug}`}
                  >
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </Link>

                  {/* Category Info */}
                  <div className="py-3 text-left">
                    <Link
                      className="text-product-title mb-3 text-gray-800"
                      href={`/category/${category.slug}`}
                    >
                      {category.name}
                    </Link>

                    {/* Subcategories */}
                    {category.subcategories &&
                      category.subcategories.length > 0 && (
                        <div className="space-y-1">
                          {category.subcategories
                            .slice(0, 3)
                            .map((subcategory, index) => (
                              <Link
                                key={index}
                                className="block text-sm text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                                href={`/category/${category.slug}?subcategory=${subcategory.slug}`}
                              >
                                {subcategory.name}
                              </Link>
                            ))}
                          {category.subcategories.length > 3 && (
                            <h3 className="text-sm text-gray-500">
                              {t("messages.showMore", {
                                count: category.subcategories.length - 3,
                              })}
                            </h3>
                          )}
                        </div>
                      )}
                  </div>
                </Link>
              ))}
              {categories.length === 0 && (
                <div className="col-span-6 text-center py-8 text-gray-500">
                  {t("messages.noCategories")}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </AnimatePresence>
  );
}
