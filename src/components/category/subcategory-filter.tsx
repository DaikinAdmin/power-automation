"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubcategoryFilterProps {
  subcategories: { id: string; name: string; slug: string }[];
  selectedSubcategories: string[];
  onSubcategoryToggle: (slug: string) => void;
}

export function SubcategoryFilter({
  subcategories,
  selectedSubcategories,
  onSubcategoryToggle,
}: SubcategoryFilterProps) {
  const t = useTranslations("categories");

  if (subcategories.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2 px-2">
        {t("filters.subcategories")}
      </h3>
      <div 
        className="flex gap-2 overflow-x-auto pb-2 px-2"
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        {subcategories.map((subcategory) => {
          const isSelected = selectedSubcategories.includes(subcategory.slug);
          return (
            <button
              key={subcategory.id}
              onClick={() => onSubcategoryToggle(subcategory.slug)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium
                whitespace-nowrap transition-colors flex-shrink-0
                ${
                  isSelected
                    ? "bg-[#404040] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }
              `}
            >
              {subcategory.name}
              {isSelected && <X className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
