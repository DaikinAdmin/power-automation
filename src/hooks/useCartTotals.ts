'use client';

import { useMemo } from 'react';
import { CartItemType } from '@/helpers/types/item';
import { useCurrency } from '@/hooks/useCurrency';
import { parsePriceString, SupportedCurrency } from '@/helpers/currency';

interface UseCartTotalsOptions {
  items: CartItemType[];
}

export const useCartTotals = ({ items }: UseCartTotalsOptions) => {
  const { convertFromCurrency, formatPriceWithCurrency, formatPrice, currencyCode } = useCurrency();

  const getItemCurrency = (item: CartItemType): SupportedCurrency =>
    (item.initialCurrency as SupportedCurrency) ?? 'EUR';

  const resolveBaseUnitPrice = (item: CartItemType): number => {
    if (typeof item.baseSpecialPrice === 'number') return item.baseSpecialPrice;
    if (typeof item.basePrice === 'number') return item.basePrice;

    if (item.availableWarehouses && item.warehouseId) {
      const warehouse = item.availableWarehouses.find((wh: { warehouseId: string; }) => wh.warehouseId === item.warehouseId);
      if (warehouse) {
        if (typeof warehouse.baseSpecialPrice === 'number') return warehouse.baseSpecialPrice;
        if (typeof warehouse.basePrice === 'number') return warehouse.basePrice;
        if (warehouse.specialPrice != null) return parsePriceString(warehouse.specialPrice);
        return parsePriceString(warehouse.price);
      }
    }

    if (typeof item.specialPrice === 'number') return item.specialPrice;
    if (typeof item.price === 'number') return item.price;

    if (item.specialPrice != null) return parsePriceString(item.specialPrice);
    return parsePriceString(item.price);
  };

  // Raw item total in source currency (for order submission)
  const getItemBaseTotal = (item: CartItemType) => resolveBaseUnitPrice(item) * item.quantity;

  // Item total converted to user's selected display currency
  const getItemTotal = (item: CartItemType) =>
    convertFromCurrency(getItemBaseTotal(item), getItemCurrency(item));

  // Cart total in user's selected display currency
  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + getItemTotal(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, convertFromCurrency]
  );

  const baseTotalPrice = totalPrice;

  // Format unit price in its source/cart currency (e.g. "100 EUR")
  const formatCartItemPrice = (item: CartItemType) =>
    formatPriceWithCurrency(resolveBaseUnitPrice(item), getItemCurrency(item));

  // Format item total in user's display currency
  const formatItemTotal = (item: CartItemType) => formatPrice(getItemTotal(item));

  // Format cart total in user's display currency
  const formatCartTotal = () => formatPrice(totalPrice);

  return {
    currencyCode,
    baseTotalPrice,
    totalPrice,
    getItemCurrency,
    resolveBaseUnitPrice,
    getItemTotal,
    getItemBaseTotal,
    formatPrice,
    formatCartItemPrice,
    formatItemTotal,
    formatCartTotal,
  };
};
