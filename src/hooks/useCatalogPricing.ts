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

  // toComparable converts (price, currency) into a common currency so warehouses
  // priced in different currencies can be compared. Without it, raw numbers are
  // compared directly (e.g. "8 EUR" < "520 UAH"), which is only right by luck —
  // pass useCurrency's convertFromCurrency here to compare real value.
  const getMinPrice = useCallback((
    item: ItemType,
    toComparable?: (price: number, currency: string) => number
  ) => {
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;

    if (!prices || prices.length === 0) {
      return { price: 0, originalPrice: null, inStock: false };
    }

    const inStockPrices = prices.filter((p: any) => p.quantity > 0);
    const pool = inStockPrices.length > 0 ? inStockPrices : prices;

    let minComparable = Infinity;
    // Raw price/currency of the winning entry — returned as-is so the caller
    // still does its own display conversion, same as before.
    let minPrice = 0;
    // Original (pre-promotion) price of the same warehouse entry that produced
    // minPrice — must not be mixed with another warehouse's price, or the
    // displayed discount ends up comparing unrelated numbers.
    let minOriginalPrice: number | null = null;
    let minPriceCurrency: string | null | undefined;
    for (const p of pool) {
      const margin = ('margin' in p ? (p as any).margin : null) ?? 0;
      const marginMultiplier = 1 + margin / 100;
      const base = (p as any).promotionPrice ?? (p as any).price;
      const final = base * marginMultiplier;
      const currency = (p as any).initialCurrency ?? 'EUR';
      const comparable = toComparable ? toComparable(final, currency) : final;
      if (comparable < minComparable) {
        minComparable = comparable;
        minPrice = final;
        minOriginalPrice = (p as any).promotionPrice != null ? (p as any).price * marginMultiplier : null;
        minPriceCurrency = (p as any).initialCurrency;
      }
    }

    return {
      price: minComparable === Infinity ? 0 : minPrice,
      originalPrice: minComparable === Infinity ? null : minOriginalPrice,
      initialCurrency: minPriceCurrency,
      inStock: inStockPrices.length > 0,
    };
  }, []);

  const getAvailableWarehouses = useCallback((item: ItemType) => {
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;

    return prices.map((priceInfo) => {
      const margin = ('margin' in priceInfo ? (priceInfo as any).margin : null) ?? 0;
      const marginMultiplier = 1 + margin / 100;
      // price/basePrice must stay the full (non-promo) price and
      // specialPrice/baseSpecialPrice the discounted one — cart-context relies
      // on this distinction to render the correct strikethrough price.
      const basePrice = priceInfo.price * marginMultiplier;
      const baseSpecialPrice =
        priceInfo.promotionPrice != null ? priceInfo.promotionPrice * marginMultiplier : undefined;
      return {
        warehouseId: priceInfo.warehouse.id,
        warehouseName: priceInfo.warehouse.name || priceInfo.warehouse.displayedName || 'Unknown Warehouse',
        warehouseCountry: priceInfo.warehouse.countrySlug || 'Unknown Country',
        displayName: priceInfo.warehouse.displayedName || undefined,
        price: basePrice,
        specialPrice: baseSpecialPrice,
        basePrice,
        baseSpecialPrice,
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
