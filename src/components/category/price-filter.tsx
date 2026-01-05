"use client";

import { useEffect, useState } from "react";
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
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);

  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value]);

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

  const handleSliderChange = (values: number[]) => {
    const [newMin, newMax] = values;
    setMinVal(newMin);
    setMaxVal(newMax);
    onChange([newMin, newMax]);
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Ціна</h3>

      {/* Inputs */}
      <div className="mb-6 flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-gray-500">Від</label>
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
          <label className="text-xs text-gray-500">До</label>
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
      <div className="px-1 py-2">
        <Slider
          min={min}
          max={max}
          step={1}
          value={[minVal, maxVal]}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* Price Range Display */}
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>{minVal.toLocaleString()} ₴</span>
        <span>{maxVal.toLocaleString()} ₴</span>
      </div>
    </div>
  );
}
