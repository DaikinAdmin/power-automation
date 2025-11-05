'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { formatCurrency, formatDate } from '@/helpers/formatting';
import { OrderStatusForm } from '@/components/admin/order-status-form';
import { Skeleton } from '@/components/ui/skeleton';

const statusOptions = ['NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING', 'DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUND'];

type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  basePrice?: number | null;
  baseSpecialPrice?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

type OrderDetail = {
  id: string;
  status: string;
  originalTotalPrice: number;
  totalPrice: string | null;
  deliveryId: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
  } | null;
  lineItems: OrderLineItem[] | null;
};

interface OrderDetailClientProps {
  orderId: string;
}

type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);
  const [status, setStatus] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          viewerRole: string;
        };

        if (!isMounted) return;

        setOrder(data.order);
        setCanUpdate(data.viewerRole === 'ADMIN' || data.viewerRole === 'EMPLOYER');
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
                  statusOptions={statusOptions}
                  canUpdate={canUpdate}
                />
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
