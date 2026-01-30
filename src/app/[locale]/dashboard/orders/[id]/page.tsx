'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Package, MapPin, Calendar, CreditCard } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getOrderStatusBadgeStyle } from '@/helpers/formatting';

type Payment = {
  id: string;
  status: string;
  currency: string;
  amount: number;
  paymentMethod?: string | null;
  sessionId?: string | null;
  transactionId?: string | null;
};

type OrderLineItem = {
  itemId: string;
  articleId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  warehouseId?: string;
  warehouseName?: string;
  warehouseDisplayedName?: string;
  warehouseCountry?: string;
};

type OrderDetails = {
  id: string;
  status: string;
  totalPrice: string | null;
  originalTotalPrice: number;
  createdAt: string;
  updatedAt: string;
  lineItems: OrderLineItem[];
  deliveryId?: string | null;
  payment?: Payment | null;
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('dashboard.orders.detail');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    let isMounted = true;

    const loadOrder = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/orders/${id}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch order' }));
          throw new Error(data.error || 'Failed to fetch order');
        }

        const data = (await response.json()) as { order: OrderDetails };
        if (!isMounted) return;
        setOrder(data.order);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unexpected error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrder().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm(t('cancelConfirm'))) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to cancel order' }));
        throw new Error(data.error || 'Failed to cancel order');
      }

      setOrder(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefundOrder = async () => {
    if (!order) return;
    if (!confirm(t('refundConfirm'))) return;

    setIsRefunding(true);
    try {
      const response = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      // Reload order to show updated status
      const orderResponse = await fetch(`/api/orders/${id}`);
      if (orderResponse.ok) {
        const data = await orderResponse.json();
        setOrder(data.order);
      }
      alert('Refund processed successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setIsRefunding(false);
    }
  };

  const handlePayOrder = () => {
    if (!order) return;
    router.push(`/payment?orderId=${order.id}`);
  };

  // Check if cancel button should be disabled
  const canCancelOrder = order && ['NEW', 'WAITING_FOR_PAYMENT', 'PROCESSING'].includes(order.status);
  
  // Check if refund button should be shown
  const canRefundOrder = order && order.status === 'REFUND' && order.payment?.status === 'COMPLETED';
  
  // Check if "Proceed with Payment" button should be shown
  const canProceedWithPayment = order && ['NEW', 'WAITING_FOR_PAYMENT'].includes(order.status) && 
    (!order.payment || order.payment.status !== 'COMPLETED');

  // Format currency with payment currency or default to EUR for originalTotalPrice
  const formatPrice = (amount?: number) => {
    if (!amount && amount !== 0) return 'N/A';
    
    // If we have payment data, use that currency and amount
    if (order?.payment) {
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: order.payment.currency,
      }).format(amount / 100);
    }
    
    // Otherwise use EUR (originalTotalPrice is in EUR cents)
    return formatCurrency(amount);
  };
  
  const getOrderTotal = () => {
    if (order?.payment?.amount) {
      // Show payment amount in the currency that was paid
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: order.payment.currency,
      }).format(order.payment.amount / 100);
    }
    // Fallback to original price in EUR
    return formatCurrency(order?.originalTotalPrice || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToOrders')}
            </Button>
          </Link>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToOrders')}
            </Button>
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          {t('orderNotFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToOrders')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('orderNumber', { id: order.id.slice(-8) })}</h1>
            <p className="text-sm text-gray-600">{t('placedOn', { date: formatDate(order.createdAt) })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusBadgeStyle(order.status)}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          {canProceedWithPayment && (
            <Button onClick={handlePayOrder} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="h-4 w-4 mr-2" />
              {t('proceedWithPayment')}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleCancelOrder}
            disabled={!canCancelOrder || isUpdating}
          >
            {isUpdating ? t('cancelling') : t('cancelOrder')}
          </Button>
          {canRefundOrder && (
            <Button
              variant="outline"
              onClick={handleRefundOrder}
              disabled={isRefunding}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              {isRefunding ? t('refunding') : t('refundOrder')}
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('orderItems', { count: order.lineItems.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.lineItems.map((item, index) => (
                  <div key={`${item.itemId}-${index}`} className="flex justify-between items-start border-b pb-4 last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">{t('articleId')}: {item.articleId}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>{t('quantity', { quantity: item.quantity })}</span>
                        {item.unitPrice && (
                          <span>{t('unit', { price: formatPrice(item.unitPrice) })}</span>
                        )}
                        {(item.warehouseDisplayedName || item.warehouseName) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {item.warehouseDisplayedName || item.warehouseName}
                              {item.warehouseCountry && ` (${item.warehouseCountry})`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {item.lineTotal ? formatPrice(item.lineTotal) : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span>{getOrderTotal()}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>{t('total')}</span>
                  <span>{getOrderTotal()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.payment && (
            <Card>
              <CardHeader>
                <CardTitle>{t('paymentInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('paymentStatus')}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    order.payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    order.payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.payment.status === 'REFUNDED' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.payment.status}
                  </span>
                </div>
                {order.payment.paymentMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('paidWith')}</span>
                    <span>{order.payment.paymentMethod}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('orderTimeline')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">{t('orderPlaced')}</p>
                  <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{t('lastUpdated')}</p>
                    <p className="text-sm text-gray-600">{formatDate(order.updatedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {order.deliveryId && (
            <Card>
              <CardHeader>
                <CardTitle>{t('deliveryInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t('deliveryId', { id: order.deliveryId })}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
