'use client';

import { useTranslations } from 'next-intl';
import { useDeliveryTranslations } from '@/helpers/use-translations';
import { DELIVERY_STATUS_OPTIONS, DELIVERY_TYPE_OPTIONS } from '@/constants/delivery';

interface Props {
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
}

export function DeliveryFilters({ statusFilter, setStatusFilter, typeFilter, setTypeFilter }: Props) {
  const t = useTranslations('adminDashboard.delivery');
  const tr = useDeliveryTranslations();
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
      >
        <option value="">{t('filters.allStatuses')}</option>
        {DELIVERY_STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{tr.statusLabel(opt)}</option>
        ))}
      </select>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
      >
        <option value="">{t('filters.allTypes')}</option>
        {DELIVERY_TYPE_OPTIONS.map((k) => (
          <option key={k} value={k}>{tr.typeLabel(k)}</option>
        ))}
      </select>
    </div>
  );
}