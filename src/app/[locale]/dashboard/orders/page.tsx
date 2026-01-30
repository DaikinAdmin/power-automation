'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getOrderStatusBadgeStyle } from '@/helpers/formatting';

type Payment = {
  id: string;
  status: string;
  currency: string;
  amount: number;
  paymentMethod?: string | null;
};

type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

type OrderListItem = {
  id: string;
  status: string;
  totalPrice: string | null;
  originalTotalPrice: number;
  createdAt: string;
  lineItems: OrderLineItem[];
  payment?: Payment | null;
};

export default function DashboardOrdersPage() {
  const t = useTranslations('dashboard.orders');
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/orders');

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch orders' }));
          throw new Error(data.error || 'Failed to fetch orders');
        }

        const data = (await response.json()) as { orders: OrderListItem[] };
        if (!isMounted) return;
        setOrders(data.orders ?? []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unexpected error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrders().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefund = async (orderId: string) => {
    if (!confirm(t('table.refundConfirm'))) {
      return;
    }

    setRefundingOrderId(orderId);
    try {
      const response = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('table.refundError'));
      }

      // Reload orders to show updated status
      const ordersResponse = await fetch('/api/orders');
      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        setOrders(data.orders ?? []);
      }
      alert(t('table.refundSuccess'));
    } catch (err: any) {
      alert(err.message || t('table.refundError'));
    } finally {
      setRefundingOrderId(null);
    }
  };

  const orderStats = useMemo(() => ({
    total: orders.length,
    new: orders.filter(order => order.status === 'NEW').length,
    processing: orders.filter(order => order.status === 'PROCESSING' || order.status === 'DELIVERY').length,
    completed: orders.filter(order => order.status === 'COMPLETED').length,
    totalRevenue: orders
      .filter(order => order.status === 'COMPLETED')
      .reduce((sum, order) => {
        // Use payment amount if available (in correct currency), otherwise use originalTotalPrice
        return sum + (order.payment?.amount || order.originalTotalPrice);
      }, 0),
  }), [orders]);

  const formatOrderPrice = (order: OrderListItem) => {
    if (order.payment && order.payment.amount) {
      // Show payment amount in the currency that was paid
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: order.payment.currency,
      }).format(order.payment.amount / 100);
    }
    // Fallback to original price in EUR
    return formatCurrency(order.originalTotalPrice);
  };

  const getPaymentStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'INITIATED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-600">{t('subtitle')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalOrders')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.total}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.active')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.processing + orderStats.new}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.completed')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.completed}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalSpend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pl-PL', {
                    style: 'currency',
                    currency: 'PLN',
                  }).format(orderStats.totalRevenue / 100)}
                </div>
                <p className="text-xs text-gray-500">{t('stats.completedOnly')}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('table.title')}</CardTitle>
          <CardDescription>{t('table.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.orderId')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.items')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.total')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.paymentStatus')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.date')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-8">
                      <div className="flex flex-col gap-4 px-4">
                        {[...Array(5)].map((_, index) => (
                          <div key={`orders-skeleton-${index}`} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-24" />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && orders.map((order) => {
                  const primaryItem = order.lineItems[0];
                  const itemsCount = order.lineItems.length;
                  const canRefund = order.status === 'REFUND' && order.payment?.status === 'COMPLETED';
                  
                  return (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm">#{order.id.slice(-8)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {t('table.itemsCount', { count: itemsCount })}
                          {primaryItem && (
                            <div className="text-xs text-gray-600 truncate max-w-48">
                              {primaryItem.name}
                              {itemsCount > 1 && ` ${t('table.moreItems', { count: itemsCount - 1 })}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {formatOrderPrice(order)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusBadgeStyle(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.payment ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeStyle(order.payment.status)}`}>
                            {order.payment.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:text-blue-900 text-sm">
                            {t('table.view')}
                          </Link>
                          {canRefund && (
                            <button
                              onClick={() => handleRefund(order.id)}
                              disabled={refundingOrderId === order.id}
                              className="text-red-600 hover:text-red-900 text-sm disabled:text-gray-400"
                            >
                              {refundingOrderId === order.id ? t('table.refunding') : t('table.refund')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      {t('table.noOrders')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
