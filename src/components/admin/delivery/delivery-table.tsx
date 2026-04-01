'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/helpers/formatting';
import { DeliveryItem } from '@/types/delivery';
import { STATUS_COLORS } from '@/constants/delivery';

interface Props {
  deliveries: DeliveryItem[];
  isLoading: boolean;
  onEdit: (delivery: DeliveryItem) => void;
}

export function DeliveryTable({ deliveries, isLoading, onEdit }: Props) {
  const t = useTranslations('adminDashboard.delivery');
  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.customer')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.type')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.addressWarehouse')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.tracking')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.status')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.order')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('table.date')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  {t('table.empty')}
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{d.user.name ?? '—'}</div>
                    <div className="text-xs text-gray-500">{d.user.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t(`type.${d.type}` as Parameters<typeof t>[0], { default: d.type })}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {d.city && <div>{d.city}</div>}
                    {d.warehouseDesc && <div className="text-xs text-gray-500">{d.warehouseDesc}</div>}
                    {(d.street || d.building) && (
                      <div className="text-xs text-gray-500">
                        {[d.street, d.building, d.flat].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {!d.city && !d.warehouseDesc && !d.street && '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {d.trackingNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {t(`status.${d.status}` as Parameters<typeof t>[0], { default: d.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.orderId ? (
                      <Link href={`/admin/orders/${d.orderId}`} className="font-mono text-xs text-red-600 hover:underline">
                        #{d.orderId.slice(0, 8)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onEdit(d)}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {t('table.edit')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}