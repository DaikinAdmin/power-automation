'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { DeliveryItem } from '@/types/delivery';
import { DELIVERY_STATUS_OPTIONS } from '@/constants/delivery';

interface Props {
  delivery: DeliveryItem;
  onClose: () => void;
  onSaved: (updated: DeliveryItem) => void;
}

export function DeliveryEditModal({ delivery, onClose, onSaved }: Props) {
  const t = useTranslations('adminDashboard.delivery');
  const [status, setStatus] = useState(delivery.status);
  const [trackingNumber, setTrackingNumber] = useState(delivery.trackingNumber ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/delivery/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber: trackingNumber.trim() || null }),
      });
      if (!res.ok) {
        const responseData = await res.json().catch(() => ({ error: t('toast.saveError') }));
        throw new Error(responseData.error || t('toast.saveError'));
      }
      const data = await res.json();
      toast.success(t('toast.saveSuccess'));
      onSaved({ ...delivery, ...data.delivery });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('toast.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">{t('modal.title')}</h3>

        <dl className="text-sm space-y-1 text-gray-600">
          <div className="flex justify-between">
            <dt className="font-medium text-gray-700">{t('modal.labelType')}</dt>
            <dd>{t(`type.${delivery.type}` as Parameters<typeof t>[0], { default: delivery.type })}</dd>
          </div>
          {delivery.city && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">{t('modal.labelCity')}</dt>
              <dd>{delivery.city}</dd>
            </div>
          )}
          {delivery.warehouseDesc && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">{t('modal.labelWarehouse')}</dt>
              <dd>{delivery.warehouseDesc}</dd>
            </div>
          )}
          {(delivery.street || delivery.building) && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">{t('modal.labelAddress')}</dt>
              <dd>{[delivery.street, delivery.building, delivery.flat].filter(Boolean).join(', ')}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-medium text-gray-700">{t('modal.labelCustomer')}</dt>
            <dd>{delivery.user.name ?? delivery.user.email ?? '—'}</dd>
          </div>
          {delivery.orderId && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">{t('modal.labelOrder')}</dt>
              <dd>
                <Link href={`/admin/orders/${delivery.orderId}`} className="text-red-600 hover:underline font-mono text-xs">
                  #{delivery.orderId.slice(0, 8)}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal.labelStatus')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSaving}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          >
            {DELIVERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{t(`status.${opt}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal.labelTracking')}</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            disabled={isSaving}
            placeholder={t('modal.trackingPlaceholder')}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('modal.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? t('modal.saving') : t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}