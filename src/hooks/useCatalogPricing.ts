import { useCallback } from 'react';
import { CartItemType, Item } from '@/helpers/types/item';
import { ItemResponse } from '@/helpers/types/api-responses';

interface CatalogPricingOptions {
  preferredCountryCode?: string;
}

type AvailableWarehouse = NonNullable<CartItemType['availableWarehouses']>[number];

// Type that can accept both Item and ItemResponse
type ItemType = Item | ItemResponse;

export const useCatalogPricing = (
  options: CatalogPricingOptions = {}
) => {
  const {
    preferredCountryCode = 'PL'
  } = options;

  const getItemDetails = useCallback((item: ItemType) => {
    // Handle both Item (itemDetails) and ItemResponse (details)
    if ('itemDetails' in item) {
      return item.itemDetails[0];
    }
    return item.details;
  }, []);

  const getItemPrice = useCallback((item: ItemType) => {
    // Handle both Item (itemPrice) and ItemResponse (prices)
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;
    
    const prioritizedPrice =
      prices.find((price) => price.warehouse.countrySlug === preferredCountryCode && price.quantity > 0) ||
      prices.find((price) => price.warehouse.countrySlug === preferredCountryCode) ||
      prices.find((price) => price.quantity > 0) ||
      prices[0];

    if (!prioritizedPrice) {
      return {
        price: 0,
        originalPrice: null,
        inStock: false,
        quantity: 0,
        warehouseId: '',
        warehouseName: undefined,
        warehouseCountry: undefined,
        displayedName: undefined
      };
    }

    const basePrice = prioritizedPrice.promotionPrice ?? prioritizedPrice.price;
    const baseOriginalPrice = prioritizedPrice.promotionPrice ? prioritizedPrice.price : null;

    // Apply margin only if field is present; public API prices already include margin
    const margin = ('margin' in prioritizedPrice ? (prioritizedPrice as any).margin : null) ?? 0;
    const price = basePrice * (1 + margin / 100);
    const originalPrice = baseOriginalPrice ? baseOriginalPrice * (1 + margin / 100) : null;

    return {
      price,
      originalPrice,
      initialCurrency: (prioritizedPrice as any).initialCurrency as string | null | undefined,
      inStock: prioritizedPrice.quantity > 0,
      quantity: prioritizedPrice.quantity,
      warehouseId: prioritizedPrice.warehouse.id,
      warehouseName: prioritizedPrice.warehouse.name || prioritizedPrice.warehouse.displayedName || undefined,
      warehouseCountry: prioritizedPrice.warehouse.countrySlug || undefined,
      displayedName: prioritizedPrice.warehouse.displayedName || undefined
    };
  }, [preferredCountryCode]);

  const getMinPrice = useCallback((item: ItemType) => {
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;

    if (!prices || prices.length === 0) {
      return { price: 0, inStock: false };
    }

    const inStockPrices = prices.filter((p: any) => p.quantity > 0);
    const pool = inStockPrices.length > 0 ? inStockPrices : prices;

    let minPrice = Infinity;
    let minPriceCurrency: string | null | undefined;
    for (const p of pool) {
      const margin = ('margin' in p ? (p as any).margin : null) ?? 0;
      const base = (p as any).promotionPrice ?? (p as any).price;
      const final = base * (1 + margin / 100);
      if (final < minPrice) {
        minPrice = final;
        minPriceCurrency = (p as any).initialCurrency;
      }
    }

    return {
      price: minPrice === Infinity ? 0 : minPrice,
      initialCurrency: minPriceCurrency,
      inStock: inStockPrices.length > 0,
    };
  }, []);

  const getAvailableWarehouses = useCallback((item: ItemType) => {
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;
    
    return prices.map((priceInfo) => {
      const margin = ('margin' in priceInfo ? (priceInfo as any).margin : null) ?? 0;
      const basePrice = priceInfo.promotionPrice ?? priceInfo.price;
      const marginMultiplier = 1 + margin / 100;
      return {
        warehouseId: priceInfo.warehouse.id,
        warehouseName: priceInfo.warehouse.name || priceInfo.warehouse.displayedName || 'Unknown Warehouse',
        warehouseCountry: priceInfo.warehouse.countrySlug || 'Unknown Country',
        displayName: priceInfo.warehouse.displayedName || undefined,
        price: basePrice * marginMultiplier,
        specialPrice: priceInfo.promotionPrice ? priceInfo.promotionPrice * marginMultiplier : undefined,
        inStock: priceInfo.quantity > 0,
        quantity: priceInfo.quantity,
        initialCurrency: (priceInfo as any).initialCurrency ?? null,
      };
    }) as AvailableWarehouse[];
  }, []);

  return {
    getItemDetails,
    getItemPrice,
    getMinPrice,
    getAvailableWarehouses
  };
};
