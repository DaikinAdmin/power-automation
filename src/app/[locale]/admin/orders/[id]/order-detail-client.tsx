'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';

import { formatCurrency, formatDate } from '@/helpers/formatting';
import { OrderStatusForm } from '@/components/admin/order-status-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ORDER_STATUS_OPTIONS } from '@/constants/order';
import { DELIVERY_STATUS_OPTIONS, TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/constants/delivery';
import type { DeliveryRecord } from '@/types/delivery';
import type { OrderDetail } from '@/types/order';

interface OrderDetailClientProps {
  orderId: string;
}

type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [delivery, setDelivery] = useState<DeliveryRecord | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);
  const [status, setStatus] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delivery edit state
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      try {
        setStatus('loading');
        setErrorMessage(null);

        const response = await fetch(`/api/admin/orders/${orderId}`);

        if (response.status === 404) {
          if (isMounted) {
            setStatus('not_found');
          }
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch order details' }));
          throw new Error(data.error || 'Failed to fetch order details');
        }

        const data = (await response.json()) as {
          order: OrderDetail;
          delivery: DeliveryRecord | null;
          viewerRole: string;
        };

        if (!isMounted) return;

        setOrder(data.order);
        if (data.delivery) {
          setDelivery(data.delivery);
          setDeliveryStatus(data.delivery.status);
          setTrackingNumber(data.delivery.trackingNumber ?? '');
        }
        setCanUpdate(data.viewerRole === 'admin' || data.viewerRole === 'employee');
        setStatus('loaded');
      } catch (error: any) {
        if (!isMounted) return;
        setErrorMessage(error.message || 'Unexpected error');
        setStatus('error');
      }
    };

    loadOrder().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const lineItems = order?.lineItems ?? [];
  const showSkeleton = status === 'loading' || status === 'idle';

  const handleSaveDelivery = async () => {
    if (!delivery || isSavingDelivery) return;
    setIsSavingDelivery(true);
    try {
      const res = await fetch(`/api/admin/delivery/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: deliveryStatus || undefined,
          trackingNumber: trackingNumber.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(d.error || 'Failed to update delivery');
      }
      const updated = await res.json();
      setDelivery(updated.delivery);
      toast.success('Доставку оновлено');
    } catch (err: any) {
      toast.error(err.message || 'Помилка оновлення доставки');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  if (status === 'not_found') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
            <p className="text-gray-600">The requested order could not be found.</p>
          </div>
          <Link
            href="/admin/orders"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
          <p className="text-gray-600">Review the order information and manage its status.</p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
        >
          Back to Orders
        </Link>
      </div>

      {status === 'error' && errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </div>
            ) : (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt className="font-medium">Order ID</dt>
                  <dd className="font-mono">#{order?.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Placed On</dt>
                  <dd>{order ? formatDate(order.createdAt) : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Status</dt>
                  <dd>{order ? order.status.replace(/_/g, ' ') : '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Total</dt>
                  <dd>
                    {order
                      ? `${formatCurrency(order.originalTotalPrice)}${order.totalPrice ? ` (${order.totalPrice})` : ''}`
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Delivery ID</dt>
                  <dd>{order?.deliveryId ? order.deliveryId : 'Not provided'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Comment</dt>
                  <dd>{order?.comment ? order.comment : 'No comment'}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
              </div>
            ) : (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt className="font-medium">Name</dt>
                  <dd>{order?.user?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Email</dt>
                  <dd>{order?.user?.email ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-medium">Phone</dt>
                  <dd>
                    {order?.user?.phoneNumber
                      ? `${order.user.countryCode || '+'}${order.user.phoneNumber}`
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={`line-item-skeleton-${index}`} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Item</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Warehouse</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Quantity</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Unit Price</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {lineItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No line items recorded for this order.
                        </td>
                      </tr>
                    )}
                    {lineItems.map((item) => (
                      <tr key={`${item.itemId}-${item.warehouseId}`}>
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">Article: {item.articleId}</div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-gray-900">{item.warehouseName || item.warehouseDisplayedName || '—'}</div>
                          <div className="text-xs text-gray-500">{item.warehouseCountry || '—'}</div>
                        </td>
                        <td className="px-4 py-2 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">
                          {typeof item.unitPrice === 'number' ? formatCurrency(item.unitPrice) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {typeof item.lineTotal === 'number' ? formatCurrency(item.lineTotal) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Delivery Details */}
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Доставка</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : !delivery ? (
              <p className="mt-3 text-sm text-gray-500">Дані доставки відсутні.</p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt className="font-medium">Тип</dt>
                  <dd>{TYPE_LABELS[delivery.type] ?? delivery.type}</dd>
                </div>
                {delivery.city && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Місто</dt>
                    <dd>{delivery.city}</dd>
                  </div>
                )}
                {delivery.warehouseDesc && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Відділення</dt>
                    <dd>{delivery.warehouseDesc}</dd>
                  </div>
                )}
                {(delivery.street || delivery.building) && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Адреса</dt>
                    <dd>
                      {[delivery.street, delivery.building, delivery.flat].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
                {delivery.paymentMethod && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Метод оплати</dt>
                    <dd>{delivery.paymentMethod.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="font-medium">Статус</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[delivery.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[delivery.status] ?? delivery.status}
                    </span>
                  </dd>
                </div>
                {delivery.trackingNumber && (
                  <div className="flex justify-between">
                    <dt className="font-medium">ТТН / Накладна</dt>
                    <dd className="font-mono">{delivery.trackingNumber}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
            <p className="mt-1 text-sm text-gray-600">
              Change the order status. Provide a delivery ticket identifier when setting the status to DELIVERY.
            </p>
            <div className="mt-4">
              {order ? (
                <OrderStatusForm
                  orderId={order.id}
                  initialStatus={order.status}
                  initialDeliveryId={order.deliveryId}
                  statusOptions={[...ORDER_STATUS_OPTIONS]}
                  canUpdate={canUpdate}
                />
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>
          </section>

          {/* Delivery management card */}
          {(delivery || showSkeleton) && (
            <section className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Керування доставкою</h2>
              <p className="mt-1 text-sm text-gray-600">Оновіть статус і номер ТТН.</p>
              {showSkeleton ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-28" />
                </div>
              ) : delivery ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="delivery-status" className="block text-sm font-medium text-gray-700">
                      Статус доставки
                    </label>
                    <select
                      id="delivery-status"
                      value={deliveryStatus}
                      onChange={(e) => setDeliveryStatus(e.target.value)}
                      disabled={!canUpdate || isSavingDelivery}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    >
                      {DELIVERY_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {STATUS_LABELS[opt] ?? opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tracking-number" className="block text-sm font-medium text-gray-700">
                      ТТН / Накладна
                    </label>
                    <input
                      id="tracking-number"
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      disabled={!canUpdate || isSavingDelivery}
                      placeholder="Номер накладної"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDelivery}
                    disabled={!canUpdate || isSavingDelivery}
                    className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingDelivery ? 'Збереження...' : 'Зберегти'}
                  </button>
                </div>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
