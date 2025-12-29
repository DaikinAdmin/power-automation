'use client';

import { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { GitCompare, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WarehouseAvailability } from '@/components/warehouse-availability';
import { useTranslations } from 'next-intl';

type ViewMode = 'grid' | 'list';

type BadgeConfig = {
  text: string;
  className?: string;
};

interface CatalogProductCardProps {
  href: string;
  imageSrc?: string[] | null;
  imageAlt?: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  badge?: BadgeConfig;
  stockBadge?: BadgeConfig;
  brand?: string | null;
  categoryName?: string | null;
  warehouseLabel?: string;
  warehouseExtraLabel?: string;
  description?: string | null;
  viewMode?: ViewMode;
  inStock: boolean;
  onAddToCart?: () => void;
  addToCartDisabled?: boolean;
  addToCartLabel?: string;
  className?: string;
  extraContent?: ReactNode;
}

const CatalogProductCard = ({
  href,
  imageSrc,
  imageAlt,
  name,
  price,
  originalPrice,
  currency = '€',
  badge,
  stockBadge,
  brand,
  categoryName,
  warehouseLabel,
  warehouseExtraLabel,
  description,
  viewMode = 'grid',
  inStock,
  onAddToCart,
  addToCartDisabled,
  addToCartLabel,
  className,
  extraContent
}: CatalogProductCardProps) => {
  const t = useTranslations("product.productCatalogCard");
  const isList = viewMode === 'list';
  const disabled = addToCartDisabled ?? !inStock;
  const resolvedAddToCartLabel = addToCartLabel || (inStock ? t('buy') : t('outOfStock'));

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled && onAddToCart) {
      onAddToCart();
    }
  };

  const handleMutedAction = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const renderHoverActions = () => {
    if (isList) return null;

    return (
      <div 
        className="absolute top-[calc(100%-1px)] left-[-1px] right-[-1px] bg-white border border-t-0 border-accent rounded-b-sm p-4 hidden group-hover:flex items-center justify-between shadow-xl z-20"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <button
          className={`px-2 py-2 rounded transition-colors text-sm ${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          disabled={disabled}
          onClick={handleAddToCart}
        >
          {resolvedAddToCartLabel}
        </button>
        <div className="flex gap-2">
          <button
            className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
            onClick={handleMutedAction}
          >
            <Heart size={16} className="text-gray-600" />
          </button>
          <button
            className="bg-gray-100 p-2 rounded hover:bg-gray-200 transition-colors"
            onClick={handleMutedAction}
          >
            <GitCompare size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  const renderListActions = () => {
    if (!isList) return null;

    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={disabled}
          onClick={handleAddToCart}
          className={`${disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
        >
          {resolvedAddToCartLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMutedAction}
        >
          <Heart className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMutedAction}
        >
          <GitCompare className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const priceDisplay = `${price} ${currency}`.trim();
  const originalPriceDisplay = originalPrice != null ? `${originalPrice} ${currency}`.trim() : null;

  return (
    <Link
      href={href}
      className={`bg-white border border-gray-200 group relative hover:border-accent hover:rounded-t-sm hover:z-30 cursor-pointer ${isList ? 'flex' : ''} ${className || ''}`.trim()}
    >
      {badge && (
        <div className="absolute top-2 left-2 z-10">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.className || ''}`.trim()}>
            {badge.text}
          </span>
        </div>
      )}
      {stockBadge && (
        <div className="absolute top-2 right-2 z-10">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${stockBadge.className || ''}`.trim()}>
            {stockBadge.text}
          </span>
        </div>
      )}

      <div className={`${isList ? 'w-48 h-48 flex-shrink-0' : 'aspect-square'} bg-gray-100 flex items-center justify-center relative overflow-hidden group-hover:rounded-t-sm`}>
        {imageSrc && imageSrc.length > 0 ? (
          imageSrc.map(
            (src, index) => index === 0 && (
              <img src={src} alt={imageAlt || name} className="w-full h-full object-cover" />
            )
          )
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className={`p-4 ${isList ? 'flex-1 flex flex-col justify-between' : ''}`}>
        <div>
          <h3 className="text-product-title mb-2 line-clamp-2">
            {name}
          </h3>
          {brand && (
            <p className="text-sm text-gray-600 mb-1">
              Brand: {brand}
            </p>
          )}
          {categoryName && (
            <p className="text-sm text-gray-600 mb-1">
              Category: {categoryName}
            </p>
          )}
          {warehouseLabel && (
            <WarehouseAvailability
              inStock={inStock}
              locationLabel={warehouseLabel}
              extraLabel={warehouseExtraLabel}
              variant="catalog"
              className="mb-2"
            />
          )}
          {extraContent}
          {isList && description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
              {description}
            </p>
          )}
        </div>

        <div className={`${isList ? 'flex items-center justify-between' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-product-price">
              {priceDisplay}
            </span>
            {originalPriceDisplay && (
              <span className="text-gray-400 line-through text-sm">
                {originalPriceDisplay}
              </span>
            )}
          </div>
          {renderListActions()}
        </div>
      </div>
      {!isList && renderHoverActions()}
    </Link>
  );
};

export default CatalogProductCard;
