import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "next-intl";
import PriceFilter from "@/components/category/price-filter";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  brands: { name: string; slug: string }[];
  warehouses: {
    id: string;
    name: string;
    country: string;
    displayedName: string;
  }[];
  selectedBrands: string[];
  selectedWarehouses: string[];
  onBrandSelection: (brand: string, checked: boolean) => void;
  onWarehouseSelection: (warehouseId: string, checked: boolean) => void;
  minPrice: number;
  maxPrice: number;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  brands,
  warehouses,
  selectedBrands,
  selectedWarehouses,
  onBrandSelection,
  onWarehouseSelection,
  minPrice,
  maxPrice,
  priceRange,
  onPriceChange,
}: MobileFilterDrawerProps) {
  const t = useTranslations("categories");

  return (
    <>
      {/* Off-canvas Filter Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] transform bg-white shadow-2xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold text-lg">
              {t("filters.title") || "Фільтри"}
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {/* Filters Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Price Filter */}
            <PriceFilter
              min={minPrice}
              max={maxPrice}
              value={priceRange}
              onChange={onPriceChange}
            />

            {/* Brands */}
            {brands.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t("filters.brands")}</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <div key={brand.slug} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mobile-brand-${brand.slug}`}
                        checked={selectedBrands.includes(brand.slug)}
                        onCheckedChange={(checked) =>
                          onBrandSelection(brand.slug, Boolean(checked))
                        }
                      />
                      <label
                        htmlFor={`mobile-brand-${brand.slug}`}
                        className="text-sm cursor-pointer"
                      >
                        {brand.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warehouses */}
            {warehouses.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">{t("filters.warehouses")}</h4>
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
                          id={`mobile-warehouse-${warehouse.id}`}
                          checked={selectedWarehouses.includes(warehouse.id)}
                          onCheckedChange={(checked) =>
                            onWarehouseSelection(warehouse.id, Boolean(checked))
                          }
                        />
                        <label
                          htmlFor={`mobile-warehouse-${warehouse.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {warehouse.displayedName}
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <Button className="w-full" onClick={onClose}>
              {t("filters.apply") || "Застосувати"}
            </Button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
