"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import type { SupportedCurrency } from "@/helpers/currency";

const CURRENCIES: { code: SupportedCurrency; symbol: string }[] = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "PLN", symbol: "zł" },
  { code: "UAH", symbol: "₴" },
];

export default function CurrencySwitcher() {
  const { currencyCode, currencySymbol, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xl leading-none font-semibold text-gray-700">
          {currencySymbol}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CURRENCIES.map(({ code, symbol }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setCurrency(code)}
            className={`flex items-center gap-2 ${code === currencyCode ? "bg-accent font-medium" : ""}`}
          >
            <span className="w-5 text-center text-base font-semibold">{symbol}</span>
            <span>{code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
