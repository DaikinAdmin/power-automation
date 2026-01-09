import { Button } from "@/components/ui/button";
import { Grid, List } from "lucide-react";
import { useTranslations } from "next-intl";

interface CategoryHeaderProps {
  categoryName: string;
  productsCount: number;
  sortBy: string;
  setSortBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}

export function CategoryHeader({
  categoryName,
  productsCount,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}: CategoryHeaderProps) {
  const t = useTranslations("categories");

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div className="overflow-hidden">
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          {productsCount} {t("productsFound")}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold truncate">
          {categoryName}
        </h1>
      </div>

      {/* Desktop Sort Options */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {t("sortBy")}
          </span>
          <div className="flex items-center border rounded-md">
            <Button
              variant={sortBy === "popularity" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy("popularity")}
              className={`${
                sortBy === "popularity"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              } rounded-r-none`}
            >
              {t("popularity")}
            </Button>
            <Button
              variant={sortBy === "price-low" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy("price-low")}
              className={`${
                sortBy === "price-low"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              } rounded-none border-l border-r`}
            >
              {t("priceLow")}
            </Button>
            <Button
              variant={sortBy === "price-high" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy("price-high")}
              className={`${
                sortBy === "price-high"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              } rounded-none border-r`}
            >
              {t("priceHigh")}
            </Button>
            <Button
              variant={sortBy === "name" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSortBy("name")}
              className={`${
                sortBy === "name"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              } rounded-l-none`}
            >
              {t("name")}
            </Button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle - Desktop Only */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{t("view")}</span>
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={`${
              viewMode === "grid"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : ""
            } rounded-r-none flex items-center`}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={`${
              viewMode === "list"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : ""
            } rounded-l-none flex items-center`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
