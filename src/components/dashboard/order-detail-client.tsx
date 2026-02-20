'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { formatCurrency, formatDate } from '@/helpers/formatting';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = {
  NEW: 'New',
  WAITING_FOR_PAYMENT: 'Awaiting Payment',
  PROCESSING: 'Processing',
  DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUND: 'Refunded',
};

type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

type OrderDetail = {
  id: string;
  status: string;
  originalTotalPrice: number;
  totalPrice: string | null;
  deliveryId: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: OrderLineItem[];
};

interface OrderDetailClientProps {
  orderId: string;
}

type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      try {
        setStatus('loading');
        setError(null);

        const response = await fetch(`/api/orders/${orderId}`);

        if (response.status === 404) {
          if (isMounted) {
            setStatus('not_found');
          }
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch order' }));
          throw new Error(data.error || 'Failed to fetch order');
        }

        const data = (await response.json()) as { order: OrderDetail };
        if (!isMounted) return;
        setOrder(data.order);
        setStatus('loaded');
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unexpected error');
        setStatus('error');
      }
    };

    loadOrder().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const lineItems = order?.lineItems ?? [];
  const displayStatus = order ? statusLabels[order.status] ?? order.status : '—';

  if (status === 'not_found') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order not found</h1>
            <p className="text-sm text-gray-600">The requested order either doesn&rsquo;t exist or is not associated with your account.</p>
          </div>
          <Link
            href="/dashboard/orders"
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
          <p className="text-sm text-gray-600">Review the items, totals, and delivery information for this order.</p>
        </div>
        <Link
          href="/dashboard/orders"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100"
        >
          Back to Orders
        </Link>
      </div>

      {status === 'error' && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        {status === 'loading' ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <dl className="mt-4 space-y-2 text-sm text-gray-700">
            <div className="flex justify-between">
              <dt className="font-medium">Order ID</dt>
              <dd className="font-mono">#{order?.id.slice(-8)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Placed on</dt>
              <dd>{order ? formatDate(order.createdAt) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Status</dt>
              <dd>{displayStatus}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Total</dt>
              <dd>{order ? `${formatCurrency(order.originalTotalPrice)}${order.totalPrice ? ` (${order.totalPrice})` : ''}` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">Delivery ID</dt>
              <dd>{order?.deliveryId ?? 'Not provided'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Items</h2>
        {status === 'loading' ? (
          <div className="mt-4 space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
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
                      No items recorded for this order.
                    </td>
                  </tr>
                )}
                {lineItems.map((item) => (
                  <tr key={`${item.itemId}-${item.articleId}`}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">Article: {item.articleId}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{item.warehouseDisplayedName || '—'}</div>
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

      <section className="rounded-lg border bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Need help?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Have a question about this order? Visit the Contact section of your dashboard to reach our support team.
        </p>
      </section>
    </div>
  );
}
