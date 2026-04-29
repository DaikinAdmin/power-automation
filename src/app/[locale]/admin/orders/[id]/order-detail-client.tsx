'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';

import { formatCurrency, formatDate } from '@/helpers/formatting';
import { OrderStatusForm } from '@/components/admin/order-status-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ORDER_STATUS_OPTIONS } from '@/constants/order';
import { DELIVERY_STATUS_OPTIONS, TYPE_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/constants/delivery';
import type { DeliveryRecord } from '@/types/delivery';
import type { OrderDetail, OrderNote } from '@/types/order';

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

  // Notes state
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

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
        if (Array.isArray(data.order.notes)) {
          setNotes(data.order.notes);
        }
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

  const handleAddNote = async () => {
    const text = newNoteText.trim();
    if (!text || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const newNote: OrderNote = {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
      };
      const updatedNotes = [...notes, newNote];
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateNotes', notes: updatedNotes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(d.error || 'Failed to save note');
      }
      setNotes(updatedNotes);
      setNewNoteText('');
      toast.success('Замітку додано');
    } catch (err: any) {
      toast.error(err.message || 'Помилка збереження замітки');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateNotes', notes: updatedNotes }),
      });
      if (!res.ok) throw new Error('Failed');
      setNotes(updatedNotes);
    } catch {
      toast.error('Помилка видалення замітки');
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(d.error || 'Failed to delete order');
      }
      toast.success('Замовлення видалено');
      router.push('/admin/orders');
    } catch (err: any) {
      toast.error(err.message || 'Помилка видалення замовлення');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
        <div className="flex items-center gap-3">
          {canUpdate && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-100"
            >
              Видалити замовлення
            </button>
          )}
          <Link
            href="/admin/orders"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
          >
            Back to Orders
          </Link>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Видалити замовлення?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Ця дія незворотня. Замовлення{' '}
              <span className="font-mono font-semibold">#{orderId.slice(0, 8)}</span> буде видалено назавжди.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteOrder()}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Видалення...' : 'Так, видалити'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      ? (order.totalGross != null && order.currency
                          ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: order.currency }).format(order.totalGross)
                          : '—')
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
                {order?.user?.userType && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Account type</dt>
                    <dd>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.user.userType === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.user.userType === 'company' ? 'Company' : 'Private'}
                      </span>
                    </dd>
                  </div>
                )}
                {order?.user?.companyName && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Company</dt>
                    <dd>{order.user.companyName}</dd>
                  </div>
                )}
                {order?.user?.vatNumber && (
                  <div className="flex justify-between">
                    <dt className="font-medium">VAT / NIP</dt>
                    <dd className="font-mono">{order.user.vatNumber}</dd>
                  </div>
                )}
                {order?.user?.addressLine && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Address</dt>
                    <dd className="text-right max-w-[60%]">{order.user.addressLine}</dd>
                  </div>
                )}
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
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Price<br />(with VAT)</th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-600">Line Total<br />(with VAT)</th>
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
                          {typeof item.unitPriceNet === 'number'
                            ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: order?.currency || 'EUR' }).format(item.unitPriceGrossConverted ?? item.unitPriceNet)
                            : '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {typeof item.lineTotalGrossConverted === 'number'
                            ? new Intl.NumberFormat('pl-PL', { style: 'currency', currency: order?.currency || 'EUR' }).format(item.lineTotalGrossConverted)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Notes History */}
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Notes history</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-500">No notes</p>
                ) : (
                  <ol className="relative border-l border-gray-200 space-y-4 ml-3">
                    {notes.map((note) => (
                      <li key={note.id} className="ml-4">
                        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-red-400" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <time className="mb-1 block text-xs font-normal leading-none text-gray-400">
                              {new Date(note.createdAt).toLocaleString('uk-UA', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </time>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                          </div>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteNote(note.id)}
                              className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                              title="Видалити замітку"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {canUpdate && (
                  <div className="mt-4 space-y-2">
                    <label htmlFor="new-note" className="block text-sm font-medium text-gray-700">
                      New Note
                    </label>
                    <textarea
                      id="new-note"
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="E.g.: Item 1 — awaiting response from supplier"
                      disabled={isSavingNote}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddNote()}
                      disabled={!newNoteText.trim() || isSavingNote}
                      className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingNote ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Delivery Details */}
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Delivery</h2>
            {showSkeleton ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : !delivery ? (
              <p className="mt-3 text-sm text-gray-500">No delivery data available.</p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <dt className="font-medium">Type</dt>
                  <dd>{TYPE_LABELS[delivery.type] ?? delivery.type}</dd>
                </div>
                {delivery.city && (
                  <div className="flex justify-between">
                    <dt className="font-medium">City</dt>
                    <dd>{delivery.city}</dd>
                  </div>
                )}
                {delivery.warehouseDesc && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Warehouse</dt>
                    <dd>{delivery.warehouseDesc}</dd>
                  </div>
                )}
                {(delivery.street || delivery.building) && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Address</dt>
                    <dd>
                      {[delivery.street, delivery.building, delivery.flat].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
                {delivery.paymentMethod && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Payment Method</dt>
                    <dd>{delivery.paymentMethod.replace(/_/g, ' ')}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="font-medium">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[delivery.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[delivery.status] ?? delivery.status}
                    </span>
                  </dd>
                </div>
                {delivery.trackingNumber && (
                  <div className="flex justify-between">
                    <dt className="font-medium">Tracking Number</dt>
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
