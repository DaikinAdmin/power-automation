'use client';

import { Badge as UiBadge } from '@/components/ui/badge';
import { WarehouseAvailability } from '@/components/warehouse-availability';
import { Heart, GitCompare, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProductPriceCardProps {
  formattedPrice: string;
  formattedOriginalPrice?: string;
  discountLabel: string | number | null;
  badgeLabel?: string | null;
  inStock: boolean;
  quantity: number;
  warehouseLabel?: string;
  extraLabel?: string;
  onAddToCart: () => void;
  onAskPrice: () => void;
  onAddToCompare?: () => void;
  isAddingToCart: boolean;
  isInCompare?: boolean;
}

export function ProductPriceCard({
  formattedPrice,
  formattedOriginalPrice,
  discountLabel,
  badgeLabel,
  inStock,
  quantity,
  warehouseLabel,
  extraLabel,
  onAddToCart,
  onAskPrice,
  onAddToCompare,
  isAddingToCart,
  isInCompare = false,
}: ProductPriceCardProps) {
  const t = useTranslations('product');
  
  const getBadgeText = (badge: string) => {
    const badgeMap: Record<string, string> = {
      'BESTSELLER': t('price.badges.bestseller'),
      'HOT_DEALS': t('price.badges.hotDeal'),
      'NEW_ARRIVALS': t('price.badges.new'),
      'LIMITED_EDITION': t('price.badges.limited'),
      'ABSENT': t('price.badges.standard'),
    };
    return badgeMap[badge] || badge;
  };

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-baseline gap-4">
        <div className="text-3xl font-bold text-gray-900">{formattedPrice}</div>
        {formattedOriginalPrice && (
          <div className="text-sm text-gray-500 line-through">{formattedOriginalPrice}</div>
        )}
        {discountLabel && (
          <UiBadge variant="destructive">-{discountLabel}%</UiBadge>
        )}
        {badgeLabel && (
          <UiBadge variant="secondary">
            {getBadgeText(badgeLabel)}
          </UiBadge>
        )}
      </div>

      <WarehouseAvailability
        variant="detail"
        inStock={inStock}
        quantity={quantity}
        locationLabel={warehouseLabel}
        extraLabel={extraLabel}
        className="mt-4"
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={onAddToCart}
          disabled={!inStock || isAddingToCart}
          className={`flex-1 rounded-lg px-6 py-3 text-white shadow transition-colors ${
            inStock
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {inStock ? t('actions.addToCart') : t('actions.outOfStock')}
        </button>
        <button 
          onClick={onAskPrice}
          className="flex h-12 items-center justify-center rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 gap-2"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">{t('actions.askPrice')}</span>
        </button>
        <button className="flex h-12 w-12 items-center justify-center rounded-lg border hover:bg-gray-50">
          <Heart className="h-5 w-5" />
        </button>
        <button 
          onClick={onAddToCompare}
          className={`flex h-12 w-12 items-center justify-center rounded-lg border transition-colors ${
            isInCompare 
              ? 'bg-blue-500 hover:bg-blue-600 border-blue-500' 
              : 'hover:bg-gray-50'
          }`}
          title={isInCompare ? t('actions.inCompare') : t('actions.addToCompare')}
        >
          <GitCompare className={`h-5 w-5 ${isInCompare ? 'text-white' : ''}`} />
        </button>
      </div>
    </div>
  );
}
