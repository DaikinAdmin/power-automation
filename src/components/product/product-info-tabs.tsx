'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ProductInfoTabsProps {
  warrantyMonths?: number | null;
}

export function ProductInfoTabs({ warrantyMonths }: ProductInfoTabsProps) {
  const [activeTab, setActiveTab] = useState<'delivery' | 'warranty' | 'documents'>('delivery');
  const t = useTranslations('product');

  return (
    <div className="rounded-lg border">
      <div className="flex border-b">
        {['delivery', 'warranty', 'documents'].map((tab) => (
          <button
            key={tab}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === tab ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'
            }`}
            onClick={() => setActiveTab(tab as typeof activeTab)}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm text-gray-600">
        {activeTab === 'delivery' && (
          <>
            <p>{t('tabContent.deliveryAvailable')}</p>
            <p className="mt-2">{t('tabContent.fasterShipping')}</p>
          </>
        )}
        {activeTab === 'warranty' && (
          <>
            <p>{warrantyMonths ? t('tabContent.manufacturerWarranty', { months: warrantyMonths }) : t('tabContent.warrantyNotSpecified')}</p>
            <p className="mt-2">{t('tabContent.additionalContracts')}</p>
          </>
        )}
        {activeTab === 'documents' && (
          <p>{t('tabContent.datasheets')}</p>
        )}
      </div>
    </div>
  );
}
