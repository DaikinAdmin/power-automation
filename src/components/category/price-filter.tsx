"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { Slider } from "@/components/ui/slider";

interface PriceFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export default function PriceFilter({
  min,
  max,
  value,
  onChange,
}: PriceFilterProps) {
  const t = useTranslations("categories");
  const { currencySymbol } = useCurrency();
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);

  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    setMinVal(newValue[0]);
    setMaxVal(newValue[1]);
    onChange([newValue[0], newValue[1]]);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value);
    if (newMin >= min && newMin < maxVal) {
      setMinVal(newMin);
      onChange([newMin, maxVal]);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    if (newMax <= max && newMax > minVal) {
      setMaxVal(newMax);
      onChange([minVal, newMax]);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{t("priceFilter.label")}</h3>

      {/* Number inputs */}
      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-gray-500">{t("priceFilter.from")}</label>
          <input
            type="number"
            value={minVal}
            min={min}
            max={maxVal - 1}
            onChange={handleMinInputChange}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-gray-500">{t("priceFilter.to")}</label>
          <input
            type="number"
            value={maxVal}
            min={minVal + 1}
            max={max}
            onChange={handleMaxInputChange}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Shadcn range slider — override --primary to red-500 */}
      <div style={{ '--primary': '0 84% 60%' } as React.CSSProperties}>
        <Slider
          min={min}
          max={max}
          step={1}
          value={[minVal, maxVal]}
          onValueChange={handleSliderChange}
        />
      </div>

      {/* Price labels */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{minVal.toLocaleString()} {currencySymbol}</span>
        <span>{maxVal.toLocaleString()} {currencySymbol}</span>
      </div>
    </div>
  );
}
