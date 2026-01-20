"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Search, Heart, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { useTranslations, useLocale } from "next-intl";
import HeaderSearch from "../searchInput";
import { useCategories } from "@/hooks/useCategories";
import { motion, AnimatePresence } from "framer-motion";
import Accordion from "@/components/ui/Accordion";
import { slideLeft } from "@/lib/animations";
import { IoIosArrowDown } from "react-icons/io";
import LanguageSwitcher from "../languge-switcher";

export default function MobileHeader() {
  const t = useTranslations("header");
  const locale = useLocale();
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { categories, isLoading: isCategoriesLoading } = useCategories(locale);

  return (
    <div className="md:hidden bg-white border-b">
      <div className="max-w-[90rem] mx-auto px-2 py-2 flex items-center justify-between">
        {/* Left: Hamburger + Search */}
        <div className="flex items-center gap-2">
          <button className="p-2" onClick={() => setIsMenuOpen(true)}>
            <Menu className="w-7 h-7 stroke-primary-gray" />
          </button>
          <HeaderSearch />
        </div>

        {/* Center: Logo */}
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="Go to homepage"
        >
          <Image
            src="/imgs/Logo.webp"
            alt="Shop logo"
            width={140}
            height={44}
            className="h-11 w-auto"
          />
        </Link>

        {/* Right: Favorites + Cart */}
        <div className="flex items-center gap-2">
          <Link href="/favorites" className="p-2">
            <Heart className="w-7 h-7 stroke-primary-gray" />
          </Link>
          <button
            aria-label={t("cart") || "Cart"}
            className="relative p-2"
            onClick={() => setIsCartModalOpen(true)}
          >
            <ShoppingCart className="w-7 h-7 stroke-primary-gray" />
            {getTotalCartItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getTotalCartItems()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hamburger Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMenuOpen ? "" : "pointer-events-none"
        }`}
      >
        <AnimatePresence mode="wait">
          {isMenuOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40"
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Sliding panel */}
              <motion.div
                {...slideLeft}
                exit={{ x: "-100%" }}
                className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex">
                    <span className="font-semibold">
                      {t("nav.menu") || "Menu"}
                    </span>
                    <LanguageSwitcher />
                  </div>
                  <button
                    className="p-2"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label={t("close") || "Close"}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                  <Link
                    href="/"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.main") || "Home"}
                  </Link>
                  {/* Categories Accordion */}
                  <Accordion
                    items={[
                      {
                        title: (isActive: boolean) => (
                          <div className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-100">
                            <span className="font-semibold">
                              {t("categories") || "Categories"}
                            </span>
                            <IoIosArrowDown
                              className={`w-4 h-4 transition-transform ${
                                isActive ? "rotate-180" : "rotate-0"
                              }`}
                            />
                          </div>
                        ),
                        content: (
                          <div className="space-y-1 ml-2">
                            {isCategoriesLoading ? (
                              <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-8 bg-gray-100 rounded animate-pulse"
                                  />
                                ))}
                              </div>
                            ) : (
                              categories.map((category) => {
                                const hasSubcategories =
                                  category.subcategories &&
                                  category.subcategories.length > 0;
                                if (!hasSubcategories) {
                                  return (
                                    <Link
                                      key={category.id}
                                      href={`/category/${category.slug}`}
                                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"
                                      onClick={() => setIsMenuOpen(false)}
                                    >
                                      <span className="text-sm">
                                        {category.name}
                                      </span>
                                    </Link>
                                  );
                                }

                                return (
                                  <Accordion
                                    key={category.id}
                                    items={[
                                      {
                                        title: (isCatOpen: boolean) => (
                                          <div className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-100">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm">
                                                {category.name}
                                              </span>
                                            </div>
                                            <IoIosArrowDown
                                              className={`w-4 h-4 transition-transform ${
                                                isCatOpen
                                                  ? "rotate-180"
                                                  : "rotate-0"
                                              }`}
                                            />
                                          </div>
                                        ),
                                        content: (
                                          <div className="ml-2 space-y-1">
                                            {category.subcategories!.map(
                                              (sub) => (
                                                <Link
                                                  key={sub.slug}
                                                  href={`/category/${category.slug}?subcategory=${sub.slug}`}
                                                  className="block px-3 py-2 rounded hover:bg-gray-100 text-sm"
                                                  onClick={() =>
                                                    setIsMenuOpen(false)
                                                  }
                                                >
                                                  {sub.name}
                                                </Link>
                                              )
                                            )}
                                          </div>
                                        ),
                                      },
                                    ]}
                                    multiple={false}
                                    defaultIndex={-1}
                                  />
                                );
                              })
                            )}
                          </div>
                        ),
                      },
                    ]}
                    multiple={false}
                    defaultIndex={-1}
                  />

                  {/* Other menu items */}
                  <Link
                    href="/brands"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.brands") || "Brands"}
                  </Link>
                  <Link
                    href="/compare"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.compare") || "Compare"}
                  </Link>
                  <Link
                    href="/purchase-delivery"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.purchaseDelivery") || "Purchase & Delivery"}
                  </Link>
                  <Link
                    href="/refunding"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.refunding") || "Refunding"}
                  </Link>
                  <Link
                    href="/contacts"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.contacts") || "Contacts"}
                  </Link>
                  <Link
                    href="/about"
                    className="block px-3 py-2 rounded hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("nav.about") || "About"}
                  </Link>
                  <div className="py-5">
                    <button className="w-full center">
                      <Link
                        href="/login"
                        className="block px-3 py-2 rounded bg-red-600 text-white text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t("nav.login") || "Login"}
                      </Link>
                    </button>
                  </div>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsSearchOpen(false)}
          />
          <div className="absolute top-0 left-0 right-0 bg-white shadow p-3">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder={t("searchPlaceholder") || "Search products..."}
              />
              <button
                className="p-2"
                onClick={() => setIsSearchOpen(false)}
                aria-label={t("close") || "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
