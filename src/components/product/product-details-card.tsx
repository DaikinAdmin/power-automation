'use client';

import { useTranslations } from 'next-intl';
import parse from 'html-react-parser';

interface ProductDetailsCardProps {
  description: string;
  brand?: string;
  warrantyMonths?: number | null;
  category: string;
  subcategory: string;
}

export function ProductDetailsCard({
  description,
  brand,
  warrantyMonths,
  category,
  subcategory,
}: ProductDetailsCardProps) {
  const t = useTranslations('product');
  
  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">{t('details.title')}</h2>
      <p className="text-sm text-black">{parse(description)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
        <div>
          <span className="font-medium">{t('details.brand')}:</span> {brand || t('details.notAvailable')}
        </div>
        <div>
          <span className="font-medium">{t('details.warranty')}:</span>{' '}
          {warrantyMonths ? t('details.warrantyMonths', { count: warrantyMonths }) : t('details.notAvailable')}
        </div>
        <div>
          <span className="font-medium">{t('details.category')}:</span> {category}
        </div>
        <div>
          <span className="font-medium">{t('details.subcategory')}:</span> {subcategory}
        </div>
      </div>
    </div>
  );
}
