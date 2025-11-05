import { useCallback } from 'react';
import { CartItemType, Item } from '@/helpers/types/item';

interface CatalogPricingOptions {
  preferredCountryCode?: string;
}

type AvailableWarehouse = NonNullable<CartItemType['availableWarehouses']>[number];

export const useCatalogPricing = (
  options: CatalogPricingOptions = {}
) => {
  const {
    preferredCountryCode = 'PL'
  } = options;

  const getItemDetails = useCallback((item: Item) => {
    return item.itemDetails[0];
  }, []);

  const getItemPrice = useCallback((item: Item) => {
    const prioritizedPrice =
      item.itemPrice.find(price => price.warehouse.country === preferredCountryCode && price.quantity > 0) ||
      item.itemPrice.find(price => price.warehouse.country === preferredCountryCode) ||
      item.itemPrice.find(price => price.quantity > 0) ||
      item.itemPrice[0];

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
      warehouseCountry: prioritizedPrice.warehouse.country || undefined,
      displayedName: prioritizedPrice.warehouse.displayedName || undefined
    };
  }, [preferredCountryCode]);

  const getAvailableWarehouses = useCallback((item: Item) => {
    return item.itemPrice.map(priceInfo => ({
      warehouseId: priceInfo.warehouse.id,
      warehouseName: priceInfo.warehouse.name || priceInfo.warehouse.displayedName || 'Unknown Warehouse',
      warehouseCountry: priceInfo.warehouse.country || 'Unknown Country',
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
