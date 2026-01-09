import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PriceFilter from "@/components/category/price-filter";

interface CategorySidebarProps {
  locale: string;
  currentSlug: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    image: string;
    subcategories: { id: string; name: string; slug: string }[];
  }[];
  brands: string[];
  warehouses: {
    id: string;
    name: string;
    country: string;
    displayedName: string;
  }[];
  selectedBrands: string[];
  selectedWarehouses: string[];
  sectionsOpen: {
    brands: boolean;
    warehouses: boolean;
  };
  onBrandSelection: (brand: string, checked: boolean) => void;
  onWarehouseSelection: (warehouseId: string, checked: boolean) => void;
  onToggleSection: (section: "brands" | "warehouses") => void;
  showAllCategories: boolean;
  setShowAllCategories: (value: boolean) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
  setShowFilters: (value: boolean) => void;
  minPrice: number;
  maxPrice: number;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
}

export function CategorySidebar({
  locale,
  currentSlug,
  categories,
  brands,
  warehouses,
  selectedBrands,
  selectedWarehouses,
  sectionsOpen,
  onBrandSelection,
  onWarehouseSelection,
  onToggleSection,
  showAllCategories,
  setShowAllCategories,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  setShowFilters,
  minPrice,
  maxPrice,
  priceRange,
  onPriceChange,
}: CategorySidebarProps) {
  const t = useTranslations("categories");

  return (
    <div className="space-y-6">
      {/* Categories List */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">{t("filters.categories")}</h3>
        <div className="space-y-2">
          {(showAllCategories ? categories : categories.slice(0, 4)).map(
            (category) => (
              <Link
                key={category.id}
                href={`/${locale}/category/${category.slug}`}
                className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                  category.slug === currentSlug
                    ? "bg-red-500 text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {category.name}
              </Link>
            )
          )}
        </div>
        {categories.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="w-full mt-3 text-sm"
          >
            {showAllCategories
              ? t("filters.hideCategories") || "Приховати"
              : t("filters.allCategories") || "Всі категорії"}
          </Button>
        )}
      </Card>

      {/* Mobile Controls */}
      <div className="md:hidden flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(true)}
          className="w-full justify-center"
        >
          {t("filter") || "Фільтр"}
        </Button>
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="popularity">{t("popularity")}</option>
            <option value="price-low">{t("priceLow")}</option>
            <option value="price-high">{t("priceHigh")}</option>
            <option value="name">{t("name")}</option>
          </select>
          <select
            className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "grid" | "list")}
          >
            <option value="grid">Сітка</option>
            <option value="list">Список</option>
          </select>
        </div>
      </div>

      {/* Price Filter (Desktop Only) */}
      <div className="hidden md:block">
        <PriceFilter
          min={minPrice}
          max={maxPrice}
          value={priceRange}
          onChange={onPriceChange}
        />
      </div>

      {/* Brands Filter (Desktop Only) */}
      {brands.length > 0 && (
        <Card className="hidden md:block p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t("filters.brands")}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSection("brands")}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sectionsOpen.brands ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>
          {sectionsOpen.brands && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {brands.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={selectedBrands.includes(brand)}
                    onCheckedChange={(checked) =>
                      onBrandSelection(brand, Boolean(checked))
                    }
                  />
                  <label
                    htmlFor={`brand-${brand}`}
                    className="text-sm cursor-pointer"
                  >
                    {brand}
                  </label>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Warehouses Filter (Desktop Only) */}
      {warehouses.length > 0 && (
        <Card className="hidden md:block p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t("filters.warehouses")}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSection("warehouses")}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sectionsOpen.warehouses ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>
          {sectionsOpen.warehouses && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {warehouses
                .sort((a, b) =>
                  a.displayedName.localeCompare(b.displayedName)
                )
                .map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`warehouse-${warehouse.id}`}
                      checked={selectedWarehouses.includes(warehouse.id)}
                      onCheckedChange={(checked) =>
                        onWarehouseSelection(warehouse.id, Boolean(checked))
                      }
                    />
                    <label
                      htmlFor={`warehouse-${warehouse.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {warehouse.displayedName}
                    </label>
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
