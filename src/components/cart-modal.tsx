'use client';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowLeft, Trash2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CartItemType } from '@/helpers/types/item';
import { useCurrency } from '@/hooks/useCurrency';
import { parsePriceString } from '@/helpers/currency';


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
  
  if (!isOpen) return null;

  const { formatPriceFromBase } = useCurrency();
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

    return {
      basePrice,
      baseSpecialPrice,
    };
  };

  const getItemBaseUnitPrice = (item: CartItemType) => {
    const { basePrice, baseSpecialPrice } = resolveBasePrices(item);
    return baseSpecialPrice ?? basePrice;
  };

  const getItemTotal = (item: CartItemType) => getItemBaseUnitPrice(item) * item.quantity;

  const cartTotal = cartItems.reduce((total, item) => total + getItemTotal(item), 0);

  const handleProceedToPayment = () => {
    onClose(); // Close the modal first
    router.push('/checkout'); // Navigate to checkout page
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center">
      <div className="bg-white mt-8 mx-24 mb-8 w-full max-w-4xl rounded-lg shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-8 border-b">
          <h2 className="text-2xl font-bold">Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 max-h-96 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg">Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 mb-4 text-sm font-semibold text-gray-600 uppercase">
                <div className="col-span-4">Item Name</div>
                <div className="col-span-3">Warehouse</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-3 text-right">Price</div>
              </div>

              {/* Cart Items */}
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const itemName = getItemName(item);
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-4 group`}
                    >
                      {/* Remove Button - appears on hover at left-center */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200 opacity-0 group-hover:opacity-100"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Product Card - no background */}
                      <div className="rounded-lg p-4 flex-1">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Item Details */}
                          <div className="col-span-4 flex items-center gap-4">
                            <img
                              src={item.itemImageLink!}
                              alt={itemName}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <div className="text-sm text-gray-500">#{item.articleId}</div>
                              <div className="font-semibold">{itemName}</div>
                              <div className="text-red-600 font-bold">
                                {formatPriceFromBase(getItemBaseUnitPrice(item))}
                                {(() => {
                                  const { basePrice, baseSpecialPrice } = resolveBasePrices(item);
                                  if (baseSpecialPrice !== undefined) {
                                    return (
                                      <span className="text-gray-400 line-through text-sm ml-2">
                                        {formatPriceFromBase(basePrice)}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Warehouse Selection */}
                          <div className="col-span-3">
                            {item.availableWarehouses && item.availableWarehouses.length > 0 && onUpdateWarehouse ? (
                              <div className="relative">
                                <select
                                  value={item.warehouseId}
                                  onChange={(e) => {
                                    const selectedWarehouse = item.availableWarehouses?.find((w: { warehouseId: string; }) => w.warehouseId === e.target.value);
                                    if (selectedWarehouse && onUpdateWarehouse) {
                                      onUpdateWarehouse(item.id, e.target.value);
                                    }
                                  }}
                                  className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                >
                                  {item.availableWarehouses.map((warehouse) => (
                                    <option
                                      key={warehouse.warehouseId}
                                      value={warehouse.warehouseId}
                                      disabled={!warehouse.inStock}
                                    >
                                      {warehouse.displayName || warehouse.warehouseName}
                                      {!warehouse.inStock ? ' - Out of stock' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin size={16} className="text-gray-400" />
                                {item.warehouseId ? (
                                  <span>
                                    {item.displayName || 'Unknown warehouse'}
                                  </span>
                                ) : (
                                  <span className="italic text-gray-400">No warehouse selected</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="col-span-2 flex items-center justify-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Item Total Price */}
                          <div className="col-span-3 text-right">
                            <div className="font-bold text-lg text-red-600">
                              {formatPriceFromBase(getItemTotal(item))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {cartItems.length > 0 && (
          <div className="border-t p-8">
            {/* Total Card */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-end items-center">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-gray-900">{formatPriceFromBase(cartTotal)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Shop</span>
              </button>
              
              <button 
                onClick={handleProceedToPayment}
                className={`bg-red-500 text-white hover:bg-red-600 px-8 py-3 rounded-lg font-semibold transition-colors`}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
