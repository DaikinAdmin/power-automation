'use client';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowLeft, Trash2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CartItemType } from '@/helpers/types/item';
import { useCurrency } from '@/hooks/useCurrency';
import { parsePriceString, SupportedCurrency } from '@/helpers/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';


interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItemType[];
  onUpdateQuantity: (id:  string, change: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateWarehouse?: (id: string, warehouseId: string) => void;
}

export default function CartModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem,
  onUpdateWarehouse 
}: CartModalProps) {
  const router = useRouter();

  const { formatPriceWithCurrency, convertFromCurrency, formatPrice, vatPercentage, vatInclusive } = useCurrency();
  const localePreferences = useMemo(() => {
    const defaults = ['en', 'pl', 'uk'];
    if (typeof navigator === 'undefined' || !navigator.language) {
      return defaults;
    }
    const normalized = navigator.language.toLowerCase();
    const parts = normalized.split('-');
    const preferences = [normalized];
    if (parts.length > 1) {
      preferences.push(parts[0]);
    }
    preferences.push(...defaults);
    return Array.from(new Set(preferences));
  }, []);

  const getItemName = (item: CartItemType) => {
    if (item.itemDetails && item.itemDetails.length > 0) {
      for (const preference of localePreferences) {
        const match = item.itemDetails.find((detail: { locale: string; }) => {
          const detailLocale = detail.locale ? detail.locale.toLowerCase() : '';
          return detailLocale === preference;
        });
        if (match?.itemName) {
          return match.itemName;
        }
      }
    }
    return item.displayName || item.itemDetails?.[0]?.itemName || 'Unnamed Product';
  };

  const resolveBasePrices = (item: CartItemType) => {
    const warehouse = item.availableWarehouses?.find((wh: { warehouseId: any; }) => wh.warehouseId === item.warehouseId);

    const basePrice = typeof item.basePrice === 'number'
      ? item.basePrice
      : warehouse && typeof warehouse.basePrice === 'number'
        ? warehouse.basePrice
        : parsePriceString(item.price);

    const baseSpecialPrice = typeof item.baseSpecialPrice === 'number'
      ? item.baseSpecialPrice
      : warehouse && typeof warehouse.baseSpecialPrice === 'number'
        ? warehouse.baseSpecialPrice
        : item.specialPrice != null
          ? parsePriceString(item.specialPrice)
          : undefined;

    return { basePrice, baseSpecialPrice };
  };

  const getItemBaseUnitPrice = (item: CartItemType) => {
    const { basePrice, baseSpecialPrice } = resolveBasePrices(item);
    return baseSpecialPrice ?? basePrice;
  };

  const getItemTotal = (item: CartItemType) => getItemBaseUnitPrice(item) * item.quantity;

  const getItemCurrency = (item: CartItemType): SupportedCurrency =>
    (item.initialCurrency as SupportedCurrency) ?? 'EUR';

  const cartTotal = cartItems.reduce((total, item) => {
    return total + convertFromCurrency(getItemTotal(item), getItemCurrency(item));
  }, 0);

  const handleProceedToPayment = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* â"€â"€ Mobile: right sidebar â"€â"€ Desktop: centered modal â"€â"€ */}

          {/* Mobile sidebar (visible on <md) */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="md:hidden ml-auto relative z-10 w-full max-w-sm h-full bg-white shadow-xl flex flex-col"
          >
            <CartContent
              cartItems={cartItems}
              getItemName={getItemName}
              resolveBasePrices={resolveBasePrices}
              getItemBaseUnitPrice={getItemBaseUnitPrice}
              getItemTotal={getItemTotal}
              getItemCurrency={getItemCurrency}
              cartTotal={cartTotal}
              formatPriceWithCurrency={formatPriceWithCurrency}
              convertFromCurrency={convertFromCurrency}
              formatPrice={formatPrice}
              vatPercentage={vatPercentage}
              vatInclusive={vatInclusive}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
              onUpdateWarehouse={onUpdateWarehouse}
              onClose={onClose}
              onProceed={handleProceedToPayment}
              mobile
            />
          </motion.div>

          {/* Desktop centered modal (visible on md+) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex relative z-10 m-auto w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl flex-col overflow-hidden"
          >
            <CartContent
              cartItems={cartItems}
              getItemName={getItemName}
              resolveBasePrices={resolveBasePrices}
              getItemBaseUnitPrice={getItemBaseUnitPrice}
              getItemTotal={getItemTotal}
              getItemCurrency={getItemCurrency}
              cartTotal={cartTotal}
              formatPriceWithCurrency={formatPriceWithCurrency}
              convertFromCurrency={convertFromCurrency}
              formatPrice={formatPrice}
              vatPercentage={vatPercentage}
              vatInclusive={vatInclusive}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
              onUpdateWarehouse={onUpdateWarehouse}
              onClose={onClose}
              onProceed={handleProceedToPayment}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* â"€â"€â"€ Shared content component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

interface ContentProps {
  cartItems: CartItemType[];
  getItemName: (item: CartItemType) => string;
  resolveBasePrices: (item: CartItemType) => { basePrice: number; baseSpecialPrice?: number };
  getItemBaseUnitPrice: (item: CartItemType) => number;
  getItemTotal: (item: CartItemType) => number;
  getItemCurrency: (item: CartItemType) => SupportedCurrency;
  cartTotal: number;
  formatPriceWithCurrency: (price: number, fromCurrency: SupportedCurrency) => string;
  convertFromCurrency: (price: number, fromCurrency: SupportedCurrency) => number;
  formatPrice: (value: number) => string;
  vatPercentage: number;
  vatInclusive: boolean;
  onUpdateQuantity: (id: string, change: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateWarehouse?: (id: string, warehouseId: string) => void;
  onClose: () => void;
  onProceed: () => void;
  mobile?: boolean;
}

function CartContent({
  cartItems, getItemName, resolveBasePrices, getItemBaseUnitPrice,
  getItemTotal, getItemCurrency, cartTotal, formatPriceWithCurrency,
  convertFromCurrency, formatPrice,
  vatPercentage, vatInclusive,
  onUpdateQuantity, onRemoveItem, onUpdateWarehouse,
  onClose, onProceed, mobile,
}: ContentProps) {
  const t = useTranslations('cart');
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center p-4 md:p-8 border-b shrink-0">
        <h2 className="text-xl md:text-2xl font-bold">{t('title')}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X size={22} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Column headers â€" desktop only */}
            {!mobile && (
              <div className="grid grid-cols-12 gap-4 mb-4 text-sm font-semibold text-gray-600 uppercase">
                <div className="col-span-4">{t('itemName')}</div>
                <div className="col-span-3">{t('warehouse')}</div>
                <div className="col-span-2 text-center">{t('quantity')}</div>
                <div className="col-span-3 text-right">{t('price')}</div>
              </div>
            )}

            {cartItems.map((item) => {
              const itemName = getItemName(item);
              const { basePrice, baseSpecialPrice } = resolveBasePrices(item);
              const unitPrice = getItemBaseUnitPrice(item);
              const rowTotal = getItemTotal(item);
              const itemCurrency = getItemCurrency(item);

              return mobile ? (
                <div key={item.id} className="flex gap-3 border-b pb-4 last:border-0">
                  <img
                    src={item.itemImageLink?.[0]}
                    alt={itemName}
                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">#{item.articleId}</div>
                    <div className="text-sm font-semibold leading-tight truncate">{itemName}</div>
                    <div className="text-red-600 font-bold text-sm mt-0.5">
                      {formatPriceWithCurrency(unitPrice, itemCurrency)}
                      {baseSpecialPrice !== undefined && (
                        <span className="text-gray-400 line-through text-xs ml-1">{formatPriceWithCurrency(basePrice, itemCurrency)}</span>
                      )}
                    </div>

                    {/* Warehouse */}
                    {item.availableWarehouses && item.availableWarehouses.length > 0 && onUpdateWarehouse ? (
                      <select
                        value={item.warehouseId}
                        onChange={(e) => onUpdateWarehouse(item.id, e.target.value)}
                        className="mt-1 w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        {item.availableWarehouses.map((wh: any) => (
                          <option key={wh.warehouseId} value={wh.warehouseId} disabled={!wh.inStock}>
                            {wh.displayName || wh.warehouseName}{!wh.inStock ? ' â€" Out of stock' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin size={11} />{item.warehouseId || 'No warehouse'}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-7 h-7 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      {/* Row total + remove */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-red-600">{formatPrice(convertFromCurrency(rowTotal, itemCurrency))}</span>
                        <button onClick={() => onRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-center gap-4 group">
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="rounded-lg p-4 flex-1">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 flex items-center gap-4">
                        <img src={item.itemImageLink?.[0]} alt={itemName} className="w-16 h-16 object-cover rounded-lg" />
                        <div>
                          <div className="text-sm text-gray-500">#{item.articleId}</div>
                          <div className="font-semibold">{itemName}</div>
                          <div className="text-red-600 font-bold">
                            {formatPriceWithCurrency(unitPrice, itemCurrency)}
                            {baseSpecialPrice !== undefined && (
                              <span className="text-gray-400 line-through text-sm ml-2">{formatPriceWithCurrency(basePrice, itemCurrency)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        {item.availableWarehouses && item.availableWarehouses.length > 0 && onUpdateWarehouse ? (
                          <select
                            value={item.warehouseId}
                            onChange={(e) => onUpdateWarehouse(item.id, e.target.value)}
                            className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                          >
                            {item.availableWarehouses.map((wh: any) => (
                              <option key={wh.warehouseId} value={wh.warehouseId} disabled={!wh.inStock}>
                                {wh.displayName || wh.warehouseName}{!wh.inStock ? ' - Out of stock' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={16} className="text-gray-400" />
                            {item.warehouseId ? item.displayName || 'Unknown warehouse' : <span className="italic text-gray-400">No warehouse selected</span>}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <button onClick={() => onUpdateQuantity(item.id, -1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40">
                          <Minus size={14} />
                        </button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100">
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="font-bold text-lg text-red-600">{formatPrice(convertFromCurrency(rowTotal, itemCurrency))}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {cartItems.length > 0 && (
        <div className="border-t p-4 md:p-8 shrink-0">
          <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6 flex justify-between items-center md:justify-end">
            <div className="text-sm font-semibold text-gray-600 md:hidden">{t('total')}</div>
            <div className="text-right">
              <div className="hidden md:block text-lg font-semibold text-gray-600">{t('total')}</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{formatPrice(cartTotal)}</div>
              {!vatInclusive && vatPercentage > 0 && (
                <div className="text-xs text-gray-500">+ {vatPercentage}% {t('vat')}</div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">{t('backToShopping')}</span>
            </button>
            <button
              onClick={onProceed}
              className="bg-red-500 text-white hover:bg-red-600 px-5 md:px-8 py-2.5 md:py-3 rounded-lg font-semibold transition-colors text-sm md:text-base"
            >
              {t('payment')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
