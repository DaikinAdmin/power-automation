"use client";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  LayoutGrid,
  X,
  Scale,
} from "lucide-react";
import { BiSolidCategory } from "react-icons/bi";
import { FaCircleUser, FaHeart } from "react-icons/fa6";
import { MdShoppingCart } from "react-icons/md";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/cart-context";
import { useCompare } from "@/components/compare-context";
import Settings from "@/components/auth/settings";
import SignOut from "@/components/auth/sign-out";
import { useCategories } from "@/hooks/useCategories";
import { useLocale, useTranslations } from "next-intl";
import HeaderSearch from "../searchInput";
import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export default function SecondaryHeader() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const t = useTranslations("header");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { getTotalCartItems, setIsCartModalOpen } = useCart();
  const { compareItems, setIsCompareModalOpen } = useCompare();
  const locale = useLocale();
  const { categories, isLoading: isCategoriesLoading } = useCategories(locale);

  // Fetch session only on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@/lib/auth-client").then(({ authClient }) => {
        authClient.getSession().then(({ data }) => {
          setSessionData(data);
          setSessionLoading(false);
        });
      });
    }
  }, []);

  // Categories are provided by useCategories(locale)

  // Debounced sear

  // Оптимізація: активна категорія
  const activeCategory = categories.find((cat) => cat.slug === hoveredCategory);
  const hasSubcategories = (activeCategory?.subcategories?.length ?? 0) > 0;

  return (
    <div className="bg-[#404040]">
      <div className="max-w-[90rem] mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Category Dropdown */}
          <NavigationMenu className="z-20" onMouseLeave={() => setHoveredCategory(null)}>
            <NavigationMenuList className="m-0 p-0">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="!bg-red-600 !text-white !rounded-none !h-auto !px-4 !py-2 hover:!bg-red-700 data-[state=open]:!bg-red-700 data-[state=open]:!text-white [&>svg:last-child]:text-white gap-2">
                  <BiSolidCategory size={25} />
                  <span className="hidden sm:inline font-bold">
                    {t("categories")}
                  </span>
                </NavigationMenuTrigger>
                <NavigationMenuContent >
                  <div
                    className="flex py-2"
                    style={{ width: hasSubcategories ? "520px" : "240px" }}
                  >
                    {/* Category column */}
                    <div className="flex-1 border-r">
                      {categories.map((category) => {
                        const isHovered = hoveredCategory === category.slug;
                        return (
                          <NavigationMenuLink asChild key={category.slug}>
                            <Link
                              href={`/category/${category.slug}`}
                              className={`block px-4 py-2 cursor-pointer transition-colors ${
                                isHovered
                                  ? "bg-gray-100"
                                  : "text-gray-800 hover:bg-gray-100"
                              }`}
                              onMouseEnter={() =>
                                setHoveredCategory(category.slug)
                              }
                            >
                              <span className="text-dropdown-item">
                                {category.name}
                              </span>
                            </Link>
                          </NavigationMenuLink>
                        );
                      })}
                    </div>

                    {/* Subcategory column */}
                    {hasSubcategories && (
                      <div className="flex-1 px-4 py-2">
                        {activeCategory!.subcategories!.map(
                          (subcategory, index) => (
                            <NavigationMenuLink asChild key={`${subcategory.name}-${index}`}>
                              <Link
                                href={`/category/${
                                  activeCategory!.slug
                                }?subcategory=${subcategory.slug}`}
                                className="block py-2 text-dropdown-sub-item text-gray-700 hover:text-blue-600 cursor-pointer transition-colors"
                              >
                                {subcategory.name}
                              </Link>
                            </NavigationMenuLink>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          {/* Search Bar */}
          <div className="flex-1">
            <HeaderSearch />
          </div>

          {/* Right buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 p-2 hover:text-opacity-60 rounded-lg transition-colors text-white"
            >
              <div className="relative">
                <Scale size={22} />
                {compareItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {compareItems.length}
                  </span>
                )}
              </div>
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
                <span className="text-sm">
                  {sessionData?.user?.name ? sessionData.user.name : t("enter")}
                </span>
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
                      {sessionData?.user && (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center px-2 hover:text-opacity-60 transition-colors"
                            onClick={() => setIsDropdownOpen(false)}
                          >
                            <Button variant="ghost">
                              <LayoutGrid size={16} />
                              {t("dashboard")}
                            </Button>
                          </Link>
                          <div className="flex items-center px-2 hover:text-opacity-60 transition-colors">
                          
                            <Settings />
                          </div>
                        </>
                      )}
                      <div className="flex items-center px-2 hover:text-opacity-60 transition-colors">
                      
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
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
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
