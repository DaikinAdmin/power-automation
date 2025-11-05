'use client';

interface WarehouseAvailabilityProps {
  inStock: boolean;
  quantity?: number;
  locationLabel?: string;
  extraLabel?: string;
  variant?: 'detail' | 'catalog';
  className?: string;
}

export const WarehouseAvailability = ({
  inStock,
  quantity,
  locationLabel,
  extraLabel,
  variant = 'catalog',
  className
}: WarehouseAvailabilityProps) => {
  const stockLabel = inStock
    ? quantity != null
      ? `${quantity} in stock`
      : 'In stock'
    : 'Out of stock';

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
        {extraLabel && (
          <span className="ml-2 text-xs text-blue-600">{extraLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`text-xs text-gray-500 ${className || ''}`.trim()}>
      {locationLabel}
      {extraLabel && (
        <span className="ml-1 text-blue-600">{extraLabel}</span>
      )}
    </div>
  );
};
