"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Search, Heart, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart-context";
import { useTranslations } from "next-intl";
import HeaderSearch from "../searchInput";

export default function MobileHeader() {
  const t = useTranslations("header");
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="md:hidden bg-white border-b">
      <div className="max-w-[90rem] mx-auto px-2 py-2 flex items-center justify-between">
        {/* Left: Hamburger + Search */}
        <div className="flex items-center gap-2">
          <button aria-label={t("openMenu") || "Menu"} className="p-2" onClick={() => setIsMenuOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <HeaderSearch />
        </div>

        {/* Center: Logo */}
        <Link href="/" className="inline-flex items-center" aria-label="Go to homepage">
          <Image src="/imgs/Logo.webp" alt="Shop logo" width={140} height={44} className="h-11 w-auto" />
        </Link>

        {/* Right: Favorites + Cart */}
        <div className="flex items-center gap-2">
          <Link href="/favorites" aria-label={t("favorites") || "Favorites"} className="p-2">
            <Heart className="w-5 h-5" />
          </Link>
          <button aria-label={t("cart") || "Cart"} className="relative p-2" onClick={() => setIsCartModalOpen(true)}>
            <ShoppingCart className="w-5 h-5" />
            {getTotalCartItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getTotalCartItems()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hamburger Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">{t("menu") || "Menu"}</span>
              <button className="p-2" onClick={() => setIsMenuOpen(false)} aria-label={t("close") || "Close"}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-2">
              {/* Move desktop items into mobile menu */}
              <Link href="/compare" className="block px-3 py-2 rounded hover:bg-gray-100">{t("compare") || "Compare"}</Link>
              <Link href="/login" className="block px-3 py-2 rounded hover:bg-gray-100">{t("login") || "Login"}</Link>
              <Link href="/categories" className="block px-3 py-2 rounded hover:bg-gray-100">{t("categories") || "Categories"}</Link>
              <Link href="/brands" className="block px-3 py-2 rounded hover:bg-gray-100">{t("brands") || "Brands"}</Link>
              <Link href="/contacts" className="block px-3 py-2 rounded hover:bg-gray-100">{t("contacts") || "Contacts"}</Link>
            </nav>
          </div>
        </div>
      )}

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsSearchOpen(false)} />
          <div className="absolute top-0 left-0 right-0 bg-white shadow p-3">
            <div className="flex items-center gap-2">
              <input className="flex-1 border rounded px-3 py-2" placeholder={t("searchPlaceholder") || "Search products..."} />
              <button className="p-2" onClick={() => setIsSearchOpen(false)} aria-label={t("close") || "Close"}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
