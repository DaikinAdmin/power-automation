"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";

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

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), maxVal - 1);
    setMinVal(newMin);
    onChange([newMin, maxVal]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), minVal + 1);
    setMaxVal(newMax);
    onChange([minVal, newMax]);
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

  const getPercent = (value: number) => 
    ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{t("priceFilter.label")}</h3>

      {/* Inputs */}
      <div className="mb-6 flex gap-2">
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

      {/* Dual Range Slider */}
      <div className="relative h-6 px-1">
        {/* Background Track */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />

        {/* Active Range */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-red-500"
          style={{
            left: `${getPercent(minVal)}%`,
            right: `${100 - getPercent(maxVal)}%`,
          }}
        />

        {/* Min Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={minVal}
          onChange={handleMinChange}
          className="range-slider-thumb pointer-events-none absolute z-[3] h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110"
          style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
        />

        {/* Max Slider */}
        <input
          type="range"
          min={min}
          max={max}
          value={maxVal}
          onChange={handleMaxChange}
          className="range-slider-thumb pointer-events-none absolute z-[4] h-6 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110"
        />
      </div>

      {/* Price Range Display */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{minVal.toLocaleString()} {currencySymbol}</span>
        <span>{maxVal.toLocaleString()} {currencySymbol}</span>
      </div>
    </div>
  );
}
