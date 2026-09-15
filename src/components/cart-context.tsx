'use client';

import { CartItemType } from '@/helpers/types/item';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parsePriceString, SupportedCurrency } from '@/helpers/currency';
import { useCurrency } from '@/hooks/useCurrency';
import { useDomainConfig } from '@/hooks/useDomain';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// Extend the Item type with cart-specific properties without creating a new standalone type

interface CartContextType {
  cartItems: CartItemType[];
  addToCart: (item: Omit<CartItemType, 'quantity'>) => void;
  updateCartQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  updateCartWarehouse: (id: string, warehouseId: string) => void;
  clearCart: () => void;
  getTotalCartItems: () => number;
  isCartModalOpen: boolean;
  setIsCartModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const { convertToCurrency } = useCurrency();
  const domainConfig = useDomainConfig();

  const normaliseCartItem = (item: CartItemType): CartItemType => {
    const resolvedWarehouse = item.availableWarehouses?.find((warehouse: { warehouseId: any; }) => warehouse.warehouseId === item.warehouseId);

    const resolvedBasePrice = typeof item.basePrice === 'number'
      ? item.basePrice
      : resolvedWarehouse && typeof resolvedWarehouse.basePrice === 'number'
        ? resolvedWarehouse.basePrice
        : parsePriceString(item.price);

    const resolvedBaseSpecialPrice = typeof item.baseSpecialPrice === 'number'
      ? item.baseSpecialPrice
      : resolvedWarehouse && typeof resolvedWarehouse.baseSpecialPrice === 'number'
        ? resolvedWarehouse.baseSpecialPrice
        : item.specialPrice != null
          ? parsePriceString(item.specialPrice)
          : undefined;

    return {
      ...item,
      price: typeof item.price === 'number' ? item.price : parsePriceString(item.price),
      specialPrice:
        item.specialPrice != null
          ? (typeof item.specialPrice === 'number' ? item.specialPrice : parsePriceString(item.specialPrice))
          : undefined,
      basePrice: resolvedBasePrice,
      baseSpecialPrice: resolvedBaseSpecialPrice,
      availableWarehouses: item.availableWarehouses?.map((warehouse) => {
        const basePrice = typeof warehouse.basePrice === 'number'
          ? warehouse.basePrice
          : parsePriceString(warehouse.price);
        const baseSpecialPrice = warehouse.specialPrice != null
          ? (typeof warehouse.baseSpecialPrice === 'number'
              ? warehouse.baseSpecialPrice
              : parsePriceString(warehouse.specialPrice))
          : undefined;

        return {
          ...warehouse,
          price: typeof warehouse.price === 'number' ? warehouse.price : parsePriceString(warehouse.price),
          specialPrice:
            warehouse.specialPrice != null
              ? (typeof warehouse.specialPrice === 'number'
                  ? warehouse.specialPrice
                  : parsePriceString(warehouse.specialPrice))
              : undefined,
          basePrice,
          baseSpecialPrice,
        };
      }) ?? item.availableWarehouses,
    };
  };

  const normaliseCartItems = (items: CartItemType[]): CartItemType[] => items.map(normaliseCartItem);

  const t = useTranslations('cart');

  // Restores a cart item's price fields to match a given availableWarehouses
  // entry — same computation as updateCartWarehouse below, factored out so
  // sanitizeAgainstVisibleWarehouses (auto-switch) and the manual selector
  // share one implementation.
  const applyWarehouseToItem = (
    item: CartItemType,
    selectedWarehouse: NonNullable<CartItemType['availableWarehouses']>[number]
  ): CartItemType => {
    const basePrice = typeof selectedWarehouse.basePrice === 'number'
      ? selectedWarehouse.basePrice
      : parsePriceString(selectedWarehouse.price);
    const baseSpecialPrice = selectedWarehouse.specialPrice != null
      ? (typeof selectedWarehouse.baseSpecialPrice === 'number'
          ? selectedWarehouse.baseSpecialPrice
          : parsePriceString(selectedWarehouse.specialPrice))
      : undefined;

    return {
      ...item,
      warehouseId: selectedWarehouse.warehouseId,
      warehouseName: selectedWarehouse.warehouseName,
      warehouseCountry: selectedWarehouse.warehouseCountry,
      price: typeof selectedWarehouse.price === 'number'
        ? selectedWarehouse.price
        : parsePriceString(selectedWarehouse.price),
      specialPrice: selectedWarehouse.specialPrice != null
        ? (typeof selectedWarehouse.specialPrice === 'number'
            ? selectedWarehouse.specialPrice
            : parsePriceString(selectedWarehouse.specialPrice))
        : undefined,
      basePrice,
      baseSpecialPrice,
      initialCurrency: selectedWarehouse.initialCurrency ?? item.initialCurrency,
    };
  };

  // A warehouse an admin hides on this domain after an item was added to the
  // cart must not silently stay orderable — the server rejects it anyway at
  // checkout (see /api/orders), this just catches it earlier with a clear
  // message instead of a checkout-time error. Also drops now-hidden entries
  // from each item's availableWarehouses so the warehouse selector doesn't
  // offer switching to something that would be rejected.
  const sanitizeAgainstVisibleWarehouses = (
    items: CartItemType[],
    visibleWarehouseIds: Set<string>
  ): { items: CartItemType[]; removedCount: number; switchedCount: number } => {
    let removedCount = 0;
    let switchedCount = 0;

    const sanitized = items.reduce<CartItemType[]>((acc, item) => {
      const filteredAvailable = item.availableWarehouses?.filter((wh) =>
        visibleWarehouseIds.has(wh.warehouseId)
      );

      if (!item.warehouseId || visibleWarehouseIds.has(item.warehouseId)) {
        acc.push(
          item.availableWarehouses
            ? { ...item, availableWarehouses: filteredAvailable }
            : item
        );
        return acc;
      }

      const replacement = filteredAvailable?.[0];
      if (replacement) {
        switchedCount++;
        acc.push(applyWarehouseToItem({ ...item, availableWarehouses: filteredAvailable }, replacement));
      } else {
        removedCount++;
      }
      return acc;
    }, []);

    return { items: sanitized, removedCount, switchedCount };
  };

  // Load cart from localStorage when component mounts, then drop/switch any
  // line still pointing at a warehouse hidden on this domain.
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (!savedCart) return;

    let restored: CartItemType[];
    try {
      const parsed: CartItemType[] = JSON.parse(savedCart);
      restored = normaliseCartItems(parsed);
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
      return;
    }

    setCartItems(restored);

    fetch('/api/public/warehouses/visible')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { warehouseIds: string[] } | null) => {
        if (!data) return;
        const visibleWarehouseIds = new Set(data.warehouseIds);
        const { items, removedCount, switchedCount } = sanitizeAgainstVisibleWarehouses(
          restored,
          visibleWarehouseIds
        );

        if (removedCount === 0 && switchedCount === 0) return;

        setCartItems(items);
        if (removedCount > 0) toast.info(t('sanitizedRemoved', { count: removedCount }));
        if (switchedCount > 0) toast.info(t('sanitizedSwitched', { count: switchedCount }));
      })
      .catch((e) => console.error('Failed to validate cart warehouse visibility:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (itemToAdd: Omit<CartItemType, 'quantity'>) => {
    // Use functional update to ensure we're working with the latest state
    setCartItems(prev => {
      const normalisedItemToAdd = normaliseCartItem(itemToAdd as CartItemType);

      // Check if item already exists in cart
      const existingItem = prev.find(item => item.id === itemToAdd.id);
      
      if (existingItem) {
        // Item exists, update quantity - IMPORTANT: Create a new array to trigger re-render
        return prev.map(item => 
          item.id === itemToAdd.id 
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      } else {
        // Item doesn't exist, add new item
        return [...prev, { ...normalisedItemToAdd, quantity: 1 }];
      }
    });
    
    // Open cart modal when adding items
    setIsCartModalOpen(true);

    // GA4/GTM add_to_cart event
    if (typeof window !== 'undefined') {
      const domainCurrency = domainConfig.currency as SupportedCurrency;
      const itemCurrency = ((itemToAdd as any).initialCurrency as SupportedCurrency) || 'EUR';
      const basePrice = (itemToAdd as any).basePrice ?? (itemToAdd as any).price ?? 0;
      const price = convertToCurrency(basePrice, itemCurrency, domainCurrency);

      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: domainCurrency,
          value: price,
          items: [{
            item_id: itemToAdd.articleId,
            item_name: (itemToAdd as any).displayName || itemToAdd.articleId,
            item_brand: (itemToAdd as any).brand?.name || '',
            item_category: itemToAdd.categorySlug || '',
            price,
            quantity: 1,
          }],
        },
      });
    }
  };

  const updateCartQuantity = (id: string, change: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, (item.quantity || 1) + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateCartWarehouse = (id: string, warehouseId: string) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id && item.availableWarehouses) {
          const selectedWarehouse = item.availableWarehouses.find(
            (wh: { warehouseId: string }) => wh.warehouseId === warehouseId
          );
          if (selectedWarehouse) {
            return applyWarehouseToItem(item, selectedWarehouse);
          }
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        updateCartWarehouse,
        clearCart,
        getTotalCartItems,
        isCartModalOpen,
        setIsCartModalOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
