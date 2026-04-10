'use client';

import { useTranslations } from 'next-intl';
import { DELIVERY_STATUS_OPTIONS, TYPE_LABELS } from '@/constants/delivery';

interface Props {
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
}

export function DeliveryFilters({ statusFilter, setStatusFilter, typeFilter, setTypeFilter }: Props) {
  const t = useTranslations('adminDashboard.delivery');
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
      >
        <option value="">{t('filters.allStatuses')}</option>
        {DELIVERY_STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{t(`status.${opt}`)}</option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
      >
        <option value="">{t('filters.allTypes')}</option>
        {Object.keys(TYPE_LABELS).map((k) => (
          <option key={k} value={k}>{t(`type.${k}`)}</option>
        ))}
      </select>
    </div>
  );
}