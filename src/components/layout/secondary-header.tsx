"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  Search,
  GitCompare,
  LayoutGrid,
  X,
} from "lucide-react";
import { BiSolidCategory } from "react-icons/bi";
import { FaCircleUser, FaHeart } from "react-icons/fa6";
import { MdShoppingCart } from "react-icons/md";
import Link from "next/link";
import { useCart } from "@/components/cart-context";
import { authClient } from "@/lib/auth-client";
import Settings from "@/components/auth/settings";
import SignOut from "@/components/auth/sign-out";
import { Category } from "@/helpers/types/item";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function SecondaryHeader() {
  const t = useTranslations("header");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const session = authClient.useSession();
  const router = useRouter();

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/public/categories/pl");
        const fetchedCategories = (await response.json()) as Category[];
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length > 0) {
        router.push(`/categories?search=${encodeURIComponent(query.trim())}`);
      }
    }, 500),
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push("/categories");
  };

  return (
    <div className="bg-[#404040]">
      <div className="max-w-[90rem] mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              onMouseEnter={() => setIsCategoriesOpen(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors h-max"
            >
              <BiSolidCategory size={25} />
              <span className="hidden sm:inline font-bold">
                {t("categories")}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isCategoriesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isCategoriesOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => {
                    setIsCategoriesOpen(false);
                    setHoveredCategory(null);
                  }}
                />

                {/* Category Dropdown */}
                <div
                  className="absolute top-full left-0 bg-white rounded-lg shadow-lg border z-20"
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    width: hoveredCategory ? "500px" : "240px", // x width when subcategory
                  }}
                >
                  <div className="flex py-2">
                    {/* category column */}
                    <div className="flex-1 border-r">
                      {categories.map((category) => {
                        const isHovered = hoveredCategory === category.id;
                        return (
                          <Link
                            key={category.id}
                            href={`/category/${category.slug}`}
                            className={`block px-4 py-2 cursor-pointer transition-colors ${
                              isHovered
                                ? "bg-gray-100"
                                : "text-gray-800 hover:bg-gray-100"
                            }`}
                            onMouseEnter={() => setHoveredCategory(category.id)}
                            onClick={() => setIsCategoriesOpen(false)}
                          >
                            <span className="text-dropdown-item">
                              {category.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* subcategory column */}
                    {hoveredCategory &&
                      categories.find((cat) => cat.id === hoveredCategory)
                        ?.subCategories?.length > 0 && (
                        <div className="flex-1 px-4 py-2">
                          {categories
                            .find((cat) => cat.id === hoveredCategory)
                            ?.subCategories?.map(
                              (
                                subcategory: { name: string },
                                index: number
                              ) => (
                                <div
                                  key={index}
                                  className="py-2 text-dropdown-sub-item text-gray-700 hover:text-blue-600 cursor-pointer transition-colors"
                                  onClick={() => setIsCategoriesOpen(false)}
                                >
                                  {subcategory.name}
                                </div>
                              )
                            )}
                        </div>
                      )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Input */}
          <div className="flex-1 flex justify-start">
            <div className="relative w-48 sm:w-64">
              <input
                type="text"
                placeholder={t("search")}
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full py-[6px] pr-10 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm
        transition-all duration-300
        ${isFocused ? "pl-2" : "pl-10"}
      `}
              />
              <Search
                size={20}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-300
        ${isFocused ? "right-3 left-auto" : "left-3 right-auto"}
      `}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/*  */}
          <div className="flex items-center gap-1">
            <button className="p-2 hover:text-opacity-60 rounded-lg transition-colors text-white">
              <GitCompare size={20} />
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
                  className={`transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                    <div className="py-2">
                      {session.data?.user && (
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
