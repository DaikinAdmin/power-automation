'use client';

import { useTranslations } from 'next-intl';

interface WarehouseAvailabilityProps {
  inStock: boolean;
  quantity?: number;
  locationLabel?: string;
  variant?: 'detail' | 'catalog';
  className?: string;
}

export const WarehouseAvailability = ({
  inStock,
  quantity,
  locationLabel,
  variant = 'catalog',
  className
}: WarehouseAvailabilityProps) => {
  const t = useTranslations('product.warehouse-availability');
  const stockLabel = inStock
    ? quantity != null
      ? `${quantity} ${t('inStock')}`
      : t('inStock')
    : t('outOfStock');

  if (variant === 'detail') {
    return (
      <div className={`flex items-center ${className || ''}`.trim()}>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {stockLabel}
        </span>
        {locationLabel && (
          <span className="ml-2 text-sm text-gray-600">{locationLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`text-xs text-gray-500 ${className || ''}`.trim()}>
      {locationLabel}
    </div>
  );
};
