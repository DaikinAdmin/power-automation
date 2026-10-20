'use client';

import { CartItemType } from '@/helpers/types/item';
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { parsePriceString, SupportedCurrency } from '@/helpers/currency';
import { useCurrency } from '@/hooks/useCurrency';
import { useDomainConfig } from '@/hooks/useDomain';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// Extend the Item type with cart-specific properties without creating a new standalone type

type CartWarehouse = NonNullable<CartItemType['availableWarehouses']>[number];

// One cart line per (article, warehouse): stock is tracked per warehouse, so
// two lines for the same pair would each pass the stock check on their own.
// Pages build cart ids differently (slug-, articleId- or product.id-based),
// so the context derives the line id itself instead of trusting theirs.
const getLineId = (articleId: string, warehouseId?: string) => `${articleId}-${warehouseId ?? ''}`;

// Re-sync with live stock when the cart is opened or the tab becomes visible
// again, but not more often than this — /api/orders re-checks stock anyway.
const STOCK_SYNC_MIN_INTERVAL_MS = 30_000;

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
  // Mirrors cartItems synchronously. Stock checks run in event handlers
  // (double clicks, toast actions, the async stock sync) and must see the
  // previous mutation even before React re-renders, so every mutation goes
  // through commitCart and reads the current cart from here.
  const cartItemsRef = useRef<CartItemType[]>([]);
  const lastStockSyncRef = useRef(0);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const { convertToCurrency, convertFromCurrency, formatPriceWithCurrency } = useCurrency();
  const domainConfig = useDomainConfig();

  const commitCart = (next: CartItemType[]) => {
    cartItemsRef.current = next;
    setCartItems(next);
  };

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

  // Re-keys lines with getLineId and merges the ones that end up on the same
  // (article, warehouse) — carts saved before line ids were derived here can
  // hold the same pair twice. Quantities above stock are capped by the stock
  // sync that runs right after restore.
  const mergeDuplicateLines = (items: CartItemType[]): CartItemType[] => {
    const lines = new Map<string, CartItemType>();
    for (const item of items) {
      const id = getLineId(item.articleId, item.warehouseId);
      const existing = lines.get(id);
      lines.set(id, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item, id });
    }
    return Array.from(lines.values());
  };

  const t = useTranslations('cart');

  // Restores a cart item's price fields to match a given availableWarehouses
  // entry — shared by the manual warehouse selector, the stock sync (which
  // also uses it to refresh the price of the current warehouse) and the
  // "add from another warehouse" toast action.
  const applyWarehouseToItem = (
    item: CartItemType,
    selectedWarehouse: CartWarehouse
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

  const getItemName = (item: CartItemType) =>
    item.displayName || item.itemDetails?.[0]?.itemName || item.articleId;

  const getUnitPrice = (entry: { price?: number; basePrice?: number; baseSpecialPrice?: number }) =>
    entry.baseSpecialPrice ?? entry.basePrice ?? entry.price ?? 0;

  const formatUnitPrice = (
    entry: { price?: number; basePrice?: number; baseSpecialPrice?: number },
    currency: string | null | undefined
  ) => formatPriceWithCurrency(getUnitPrice(entry), (currency as SupportedCurrency) || 'EUR');

  // Stock of the line's own warehouse as last seen by the cart; undefined
  // means unknown — no client-side limit then, the server still checks.
  const getLineStock = (item: CartItemType) =>
    item.availableWarehouses?.find((warehouse) => warehouse.warehouseId === item.warehouseId)?.quantity;

  const getQuantityInCart = (items: CartItemType[], articleId: string, warehouseId: string) =>
    items.find((item) => item.id === getLineId(articleId, warehouseId))?.quantity ?? 0;

  // Cheapest other warehouse of the same article that still has stock beyond
  // what the cart already holds from it.
  const findAlternativeWarehouse = (item: CartItemType, items: CartItemType[]) => {
    let best: { warehouse: CartWarehouse; available: number; comparablePrice: number } | null = null;
    for (const warehouse of item.availableWarehouses ?? []) {
      if (warehouse.warehouseId === item.warehouseId) continue;
      const available = warehouse.quantity - getQuantityInCart(items, item.articleId, warehouse.warehouseId);
      if (available <= 0) continue;
      const comparablePrice = convertFromCurrency(
        getUnitPrice(warehouse),
        ((warehouse.initialCurrency ?? item.initialCurrency) as SupportedCurrency) || 'EUR'
      );
      if (!best || comparablePrice < best.comparablePrice) {
        best = { warehouse, available, comparablePrice };
      }
    }
    return best;
  };

  // Shows `title`; when another warehouse still has this article, adds what
  // it has and at what price, with a one-click action to add it from there.
  // `toastId` makes repeated clicks on "+" update one toast instead of
  // stacking new ones.
  const notifyWithAlternative = (title: string, item: CartItemType, toastId: string) => {
    const alternative = findAlternativeWarehouse(item, cartItemsRef.current);
    if (!alternative) {
      toast.info(title, { id: toastId });
      return;
    }

    const { warehouse, available } = alternative;
    toast.info(title, {
      id: toastId,
      description: t('stockAlternative', {
        count: available,
        price: formatUnitPrice(warehouse, warehouse.initialCurrency ?? item.initialCurrency),
        warehouse: warehouse.displayName || warehouse.warehouseName,
      }),
      action: {
        label: t('addAlternative'),
        onClick: () => addToCart(applyWarehouseToItem(item, warehouse)),
      },
      duration: 10_000,
    });
  };

  const notifyStockLimit = (item: CartItemType, stock: number) => {
    notifyWithAlternative(
      t('stockLimit', { count: Math.max(0, stock), price: formatUnitPrice(item, item.initialCurrency) }),
      item,
      `stock-limit-${item.id}`
    );
  };

  // Brings lines in line with live stock: refreshes each line's warehouses
  // and price, drops it when its warehouse is sold out and caps its quantity
  // at what is left. A line whose warehouse is gone (hidden on this domain
  // or its price removed) moves to another warehouse that has stock, or is
  // dropped when there is none. Lines of articles that were not part of the
  // request (added while it was in flight) are left untouched.
  const reconcileWithStock = (
    items: CartItemType[],
    stock: Record<string, CartWarehouse[]>,
    syncedArticleIds: Set<string>
  ) => {
    let removedCount = 0;
    let switchedCount = 0;
    const lines = new Map<string, CartItemType>();

    for (const item of items) {
      if (!syncedArticleIds.has(item.articleId)) {
        lines.set(item.id, item);
        continue;
      }

      const warehouses = stock[item.articleId] ?? [];
      let target = warehouses.find((warehouse) => warehouse.warehouseId === item.warehouseId);
      if (!target) {
        target = warehouses.find((warehouse) => warehouse.quantity > 0);
        if (!target) {
          removedCount++;
          continue;
        }
        switchedCount++;
      }

      const line = {
        ...applyWarehouseToItem({ ...item, availableWarehouses: warehouses }, target),
        id: getLineId(item.articleId, target.warehouseId),
      };
      const existing = lines.get(line.id);
      lines.set(line.id, existing ? { ...existing, quantity: existing.quantity + line.quantity } : line);
    }

    const soldOut: CartItemType[] = [];
    const reduced: CartItemType[] = [];
    const reconciled: CartItemType[] = [];

    for (const line of lines.values()) {
      const stockLeft = syncedArticleIds.has(line.articleId) ? getLineStock(line) : undefined;
      if (stockLeft !== undefined && stockLeft <= 0) {
        soldOut.push(line);
      } else if (stockLeft !== undefined && line.quantity > stockLeft) {
        const capped = { ...line, quantity: stockLeft };
        reduced.push(capped);
        reconciled.push(capped);
      } else {
        reconciled.push(line);
      }
    }

    return { items: reconciled, removedCount, switchedCount, soldOut, reduced };
  };

  const applyStock = (stock: Record<string, CartWarehouse[]>, syncedArticleIds: Set<string>) => {
    // Reconciles what the cart holds now, not what it held when the request
    // was sent — the user may have changed it in the meantime.
    const { items, removedCount, switchedCount, soldOut, reduced } = reconcileWithStock(
      cartItemsRef.current,
      stock,
      syncedArticleIds
    );
    commitCart(items);

    if (removedCount > 0) toast.info(t('sanitizedRemoved', { count: removedCount }));
    if (switchedCount > 0) toast.info(t('sanitizedSwitched', { count: switchedCount }));
    for (const line of soldOut) {
      notifyWithAlternative(t('soldOutRemoved', { name: getItemName(line) }), line, `sold-out-${line.id}`);
    }
    for (const line of reduced) {
      toast.info(t('quantityReduced', { name: getItemName(line), count: line.quantity }));
    }
  };

  // The stock response arrives after an await, so it is handled by the
  // latest render's applyStock (current exchange rates and translations),
  // not the one captured when the request was sent.
  const applyStockRef = useRef(applyStock);
  useEffect(() => {
    applyStockRef.current = applyStock;
  });

  const syncWithStock = async () => {
    const articleIds = Array.from(new Set(cartItemsRef.current.map((item) => item.articleId).filter(Boolean)));
    if (articleIds.length === 0) return;
    lastStockSyncRef.current = Date.now();

    let stock: Record<string, CartWarehouse[]>;
    try {
      const res = await fetch('/api/public/cart/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      // An article missing from `items` is treated as no longer available,
      // so a malformed response must not reach reconcileWithStock.
      if (!data?.items || typeof data.items !== 'object') return;
      stock = data.items;
    } catch (e) {
      console.error('Failed to sync cart with stock:', e);
      return;
    }

    applyStockRef.current(stock, new Set(articleIds));
  };

  const syncWithStockIfStale = () => {
    if (Date.now() - lastStockSyncRef.current < STOCK_SYNC_MIN_INTERVAL_MS) return;
    syncWithStock();
  };

  // Load cart from localStorage when component mounts, then sync it with
  // live stock — the user may come back long after adding the items.
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (!savedCart) return;

    try {
      const parsed: CartItemType[] = JSON.parse(savedCart);
      commitCart(mergeDuplicateLines(normaliseCartItems(parsed)));
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e);
      return;
    }

    syncWithStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCartModalOpen) syncWithStockIfStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartModalOpen]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncWithStockIfStale();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (itemToAdd: Omit<CartItemType, 'quantity'>) => {
    const normalisedItemToAdd = normaliseCartItem(itemToAdd as CartItemType);
    const id = getLineId(normalisedItemToAdd.articleId, normalisedItemToAdd.warehouseId);
    const existingItem = cartItemsRef.current.find((item) => item.id === id);
    const nextLine: CartItemType = existingItem
      ? {
          ...existingItem,
          // The page adding the item has just loaded its warehouses — fresher
          // stock than what the cart line was holding.
          availableWarehouses: normalisedItemToAdd.availableWarehouses ?? existingItem.availableWarehouses,
          quantity: existingItem.quantity + 1,
        }
      : { ...normalisedItemToAdd, id, quantity: 1 };

    // Open cart modal when adding items — also when the add is refused, so
    // the toast explaining why shows up next to the cart.
    setIsCartModalOpen(true);

    const stock = getLineStock(nextLine);
    if (stock !== undefined && nextLine.quantity > stock) {
      notifyStockLimit(nextLine, stock);
      return;
    }

    commitCart(
      existingItem
        ? cartItemsRef.current.map((item) => (item.id === id ? nextLine : item))
        : [...cartItemsRef.current, nextLine]
    );

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
    const line = cartItemsRef.current.find((item) => item.id === id);
    if (!line) return;

    const quantity = Math.max(1, line.quantity + change);
    const stock = getLineStock(line);
    if (change > 0 && stock !== undefined && quantity > stock) {
      notifyStockLimit(line, stock);
      return;
    }

    commitCart(cartItemsRef.current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const removeFromCart = (id: string) => {
    commitCart(cartItemsRef.current.filter((item) => item.id !== id));
  };

  const updateCartWarehouse = (id: string, warehouseId: string) => {
    const line = cartItemsRef.current.find((item) => item.id === id);
    const selectedWarehouse = line?.availableWarehouses?.find((wh) => wh.warehouseId === warehouseId);
    if (!line || !selectedWarehouse || line.warehouseId === warehouseId) return;

    // Switching onto a warehouse the cart already holds this article from
    // merges the two lines (see getLineId), capped at that warehouse's stock.
    const newId = getLineId(line.articleId, warehouseId);
    const mergedQuantity = line.quantity + getQuantityInCart(cartItemsRef.current, line.articleId, warehouseId);
    const quantity = Math.max(1, Math.min(mergedQuantity, selectedWarehouse.quantity));
    const switched = { ...applyWarehouseToItem(line, selectedWarehouse), id: newId, quantity };

    commitCart(
      cartItemsRef.current
        .filter((item) => item.id !== newId)
        .map((item) => (item.id === id ? switched : item))
    );

    if (quantity < mergedQuantity) {
      toast.info(t('quantityReduced', { name: getItemName(line), count: quantity }));
    }
  };

  const clearCart = () => {
    commitCart([]);
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
