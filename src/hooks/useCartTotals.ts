'use client';

import { useMemo } from 'react';
import { CartItemType } from '@/helpers/types/item';
import { useCurrency } from '@/hooks/useCurrency';
import { parsePriceString } from '@/helpers/currency';

interface UseCartTotalsOptions {
  items: CartItemType[];
}

export const useCartTotals = ({ items }: UseCartTotalsOptions) => {
  const { convertPrice, formatPriceFromBase, currencyCode } = useCurrency();

  const resolveBaseUnitPrice = (item: CartItemType) => {
    if (typeof item.baseSpecialPrice === 'number') return item.baseSpecialPrice;
    if (typeof item.basePrice === 'number') return item.basePrice;

    if (item.availableWarehouses && item.warehouseId) {
      const warehouse = item.availableWarehouses.find((wh) => wh.warehouseId === item.warehouseId);
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

  const baseTotalPrice = useMemo(() => {
    return items.reduce((total, item) => {
      const baseUnitPrice = resolveBaseUnitPrice(item);
      return total + baseUnitPrice * item.quantity;
    }, 0);
  }, [items]);

  const totalPrice = useMemo(() => convertPrice(baseTotalPrice), [baseTotalPrice, convertPrice]);

  const getItemBaseTotal = (item: CartItemType) => {
    const baseUnitPrice = resolveBaseUnitPrice(item);
    return baseUnitPrice * item.quantity;
  };

  const getItemTotal = (item: CartItemType) => convertPrice(getItemBaseTotal(item));

  const formatPrice = (baseValue: number) => formatPriceFromBase(baseValue);

  return {
    currencyCode,
    baseTotalPrice,
    totalPrice,
    getItemTotal,
    getItemBaseTotal,
    formatPrice,
  };
};
