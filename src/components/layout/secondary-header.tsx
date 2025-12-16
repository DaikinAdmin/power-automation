"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  LayoutGrid,
  X,
  Scale
} from "lucide-react";
import { BiSolidCategory } from "react-icons/bi";
import { FaCircleUser, FaHeart } from "react-icons/fa6";
import { MdShoppingCart } from "react-icons/md";
import Link from "next/link";
import { useCart } from "@/components/cart-context";
import Settings from "@/components/auth/settings";
import SignOut from "@/components/auth/sign-out";
import { Category } from "@/helpers/types/item";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from 'next-intl';
import HeaderSearch from "../searchInput";

export default function SecondaryHeader() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const t = useTranslations("header");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const router = useRouter();
  const locale = useLocale();

  // Fetch session only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/auth-client').then(({ authClient }) => {
        authClient.getSession().then(({ data }) => {
          setSessionData(data);
          setSessionLoading(false);
        });
      });
    }
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`/api/public/categories/${locale}`);
        const fetchedCategories = await response.json() as Category[];
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [locale]);

  // Debounced sear


  // Оптимізація: активна категорія
  const activeCategory = categories.find(cat => cat.slug === hoveredCategory);
  const hasSubcategories = activeCategory?.subCategories?.length! > 0;

  return (
    <div className="bg-[#404040]">
      <div className="max-w-[90rem] mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              onMouseEnter={() => setIsCategoriesOpen(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors h-max"
            >
              <BiSolidCategory size={25} />
              <span className="hidden sm:inline font-bold">{t("categories")}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${isCategoriesOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCategoriesOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => { setIsCategoriesOpen(false); setHoveredCategory(null); }}
                />

                <div
                  className="absolute top-full left-0 bg-white rounded-lg shadow-lg border z-20"
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{ width: hasSubcategories ? "500px" : "240px" }}
                >
                  <div className="flex py-2">

                    {/* Category column */}
                    <div className="flex-1 border-r">
                      {categories.map(category => {
                        const isHovered = hoveredCategory === category.slug;
                        return (
                          <Link
                            key={category.slug}
                            href={`/category/${category.slug}`}
                            className={`block px-4 py-2 cursor-pointer transition-colors ${isHovered ? "bg-gray-100" : "text-gray-800 hover:bg-gray-100"}`}
                            onMouseEnter={() => setHoveredCategory(category.slug)}
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            <span className="text-dropdown-item">{category.name}</span>
                          </Link>
                        )
                      })}
                    </div>

                    {/* Subcategory column */}
                    {hasSubcategories && (
                      <div className="flex-1 px-4 py-2">
                        {activeCategory!.subCategories!.map((subcategory, index) => (
                          <div
                            key={`${subcategory.name}-${index}`}
                            className="py-2 text-dropdown-sub-item text-gray-700 hover:text-blue-600 cursor-pointer transition-colors"
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            {subcategory.name}
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              </>
            )}
          </div>
          {/* Search Bar */}
          <div className="flex-1">
            <HeaderSearch
            />
          </div>

          {/* Right buttons */}
          <div className="flex items-center gap-1">
            <button className="p-2 hover:text-opacity-60 rounded-lg transition-colors text-white">
              <Scale size={22} />
            </button>
            <button className="p-2 hover:text-opacity-60 rounded-lg transition-colors text-white">
              <FaHeart size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 p-2 hover:text-opacity-60 rounded-lg transition-colors text-white"
              >
                <FaCircleUser size={20} />
                <span className="text-sm">{t("enter")}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    <div className="py-2">
                      {sessionData?.user && (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2 hover:text-opacity-60 transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <LayoutGrid size={16} />
                            <span>{t("dashboard")}</span>
                          </Link>
                          <div className="flex items-center gap-3 px-4 py-2 hover:text-opacity-60 transition-colors">
                            <SettingsIcon size={16} />
                            <Settings />
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-3 px-4 py-2 hover:text-opacity-60 transition-colors">
                        <LogOut size={16} />
                        <SignOut />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsCartModalOpen(true)}
              className="flex items-center gap-2 p-2 hover:text-opacity-60 rounded-lg transition-colors text-white"
            >
              <div className="relative">
                <MdShoppingCart size={20} />
                {getTotalCartItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalCartItems()}
                  </span>
                )}
              </div>
              <span className="text-sm">{t("cart")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
