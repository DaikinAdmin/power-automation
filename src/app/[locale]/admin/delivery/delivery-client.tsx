'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/helpers/formatting';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryItem = {
  id: string;
  userId: string;
  orderId: string | null;
  type: string;
  city: string | null;
  warehouseDesc: string | null;
  street: string | null;
  building: string | null;
  flat: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
  };
};

type Stats = Record<string, number>;

// ─── Label maps ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PICKUP: 'Самовивіз',
  USER_ADDRESS: 'Адреса',
  NOVA_POSHTA: 'Нова Пошта',
  COURIER: "Кур'єр",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  PROCESSING: 'Обробляється',
  IN_TRANSIT: 'В дорозі',
  DELIVERED: 'Доставлено',
  RETURNED: 'Повернено',
  CANCELLED: 'Скасовано',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const DELIVERY_STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED'];

// ─── Inline edit modal ────────────────────────────────────────────────────────

function EditModal({
  delivery,
  onClose,
  onSaved,
}: {
  delivery: DeliveryItem;
  onClose: () => void;
  onSaved: (updated: DeliveryItem) => void;
}) {
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
        const d = await res.json().catch(() => ({ error: 'Помилка' }));
        throw new Error(d.error || 'Помилка збереження');
      }
      const data = await res.json();
      toast.success('Доставку оновлено');
      onSaved({ ...delivery, ...data.delivery });
    } catch (err: any) {
      toast.error(err.message || 'Помилка');
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
        <h3 className="text-lg font-semibold text-gray-900">Редагувати доставку</h3>

        {/* Info */}
        <dl className="text-sm space-y-1 text-gray-600">
          <div className="flex justify-between">
            <dt className="font-medium text-gray-700">Тип</dt>
            <dd>{TYPE_LABELS[delivery.type] ?? delivery.type}</dd>
          </div>
          {delivery.city && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Місто</dt>
              <dd>{delivery.city}</dd>
            </div>
          )}
          {delivery.warehouseDesc && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Відділення</dt>
              <dd>{delivery.warehouseDesc}</dd>
            </div>
          )}
          {(delivery.street || delivery.building) && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Адреса</dt>
              <dd>{[delivery.street, delivery.building, delivery.flat].filter(Boolean).join(', ')}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-medium text-gray-700">Замовник</dt>
            <dd>{delivery.user.name ?? delivery.user.email ?? '—'}</dd>
          </div>
          {delivery.orderId && (
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Ордер</dt>
              <dd>
                <Link href={`/admin/orders/${delivery.orderId}`} className="text-red-600 hover:underline font-mono text-xs">
                  #{delivery.orderId.slice(0, 8)}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус доставки</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSaving}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          >
            {DELIVERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{STATUS_LABELS[opt] ?? opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ТТН / Накладна</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            disabled={isSaving}
            placeholder="Номер накладної"
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
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSaving ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeliveryClient() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingDelivery, setEditingDelivery] = useState<DeliveryItem | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/admin/delivery?${params}`);
      if (!res.ok) throw new Error('Failed to load deliveries');
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
      setStats(data.stats ?? {});
    } catch {
      toast.error('Не вдалося завантажити доставки');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleSaved = (updated: DeliveryItem) => {
    setDeliveries((prev) => prev.map((d) => d.id === updated.id ? updated : d));
    setEditingDelivery(null);
  };

  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);
  const inTransitCount = stats['IN_TRANSIT'] ?? 0;
  const pendingCount = (stats['PENDING'] ?? 0) + (stats['PROCESSING'] ?? 0);
  const deliveredCount = stats['DELIVERED'] ?? 0;

  return (
    <div className="space-y-6">
      {editingDelivery && (
        <EditModal
          delivery={editingDelivery}
          onClose={() => setEditingDelivery(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Доставки</h1>
          <p className="text-gray-600">Управління доставками замовлень</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Всього', value: totalCount, color: 'text-gray-900' },
          { label: 'В дорозі', value: inTransitCount, color: 'text-indigo-700' },
          { label: 'Очікують', value: pendingCount, color: 'text-yellow-700' },
          { label: 'Доставлено', value: deliveredCount, color: 'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
        >
          <option value="">Всі статуси</option>
          {DELIVERY_STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{STATUS_LABELS[opt] ?? opt}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm text-sm focus:border-red-500 focus:ring-red-500"
        >
          <option value="">Всі типи</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Замовник</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Тип</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Адреса / Відділення</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ТТН</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Статус</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ордер</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Дата</th>
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
                    Доставок не знайдено
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{d.user.name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{d.user.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{TYPE_LABELS[d.type] ?? d.type}</td>
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
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.orderId ? (
                        <Link
                          href={`/admin/orders/${d.orderId}`}
                          className="font-mono text-xs text-red-600 hover:underline"
                        >
                          #{d.orderId.slice(0, 8)}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditingDelivery(d)}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Редагувати
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
