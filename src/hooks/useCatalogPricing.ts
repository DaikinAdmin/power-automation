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

    const price = prioritizedPrice.promotionPrice ?? prioritizedPrice.price;
    const originalPrice = prioritizedPrice.promotionPrice ? prioritizedPrice.price : null;

    return {
      price,
      originalPrice,
      inStock: prioritizedPrice.quantity > 0,
      quantity: prioritizedPrice.quantity,
      warehouseId: prioritizedPrice.warehouse.id,
      warehouseName: prioritizedPrice.warehouse.name || prioritizedPrice.warehouse.displayedName || undefined,
      warehouseCountry: prioritizedPrice.warehouse.countrySlug || undefined,
      displayedName: prioritizedPrice.warehouse.displayedName || undefined
    };
  }, [preferredCountryCode]);

  const getAvailableWarehouses = useCallback((item: ItemType) => {
    const prices = 'itemPrice' in item ? item.itemPrice : item.prices;
    
    return prices.map((priceInfo) => ({
      warehouseId: priceInfo.warehouse.id,
      warehouseName: priceInfo.warehouse.name || priceInfo.warehouse.displayedName || 'Unknown Warehouse',
      warehouseCountry: priceInfo.warehouse.countrySlug || 'Unknown Country',
      displayName: priceInfo.warehouse.displayedName || undefined,
      price: priceInfo.promotionPrice ?? priceInfo.price,
      specialPrice: priceInfo.promotionPrice || undefined,
      inStock: priceInfo.quantity > 0,
      quantity: priceInfo.quantity
    })) as AvailableWarehouse[];
  }, []);

  return {
    getItemDetails,
    getItemPrice,
    getAvailableWarehouses
  };
};
