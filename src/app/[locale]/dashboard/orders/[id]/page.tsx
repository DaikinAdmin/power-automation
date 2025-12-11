'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, Calendar, CreditCard } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getOrderStatusBadgeStyle } from '@/helpers/formatting';

type OrderLineItem = {
  itemId: string;
  articleId: string;
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
};

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
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

  const handlePayOrder = () => {
    // Implement payment logic here
    console.log('Pay order:', order?.id);
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
              Back to Orders
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
              Back to Orders
            </Button>
          </Link>
        </div>
        <div className="text-center py-8 text-gray-500">
          Order not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h1>
            <p className="text-sm text-gray-600">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusBadgeStyle(order.status)}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          {order.status === 'WAITING_FOR_PAYMENT' && (
            <Button onClick={handlePayOrder} className="bg-green-600 hover:bg-green-700">
              <CreditCard className="h-4 w-4 mr-2" />
              Pay Now
            </Button>
          )}
          {order.status === 'NEW' && (
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={isUpdating}
            >
              {isUpdating ? 'Cancelling...' : 'Cancel Order'}
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
                Order Items ({order.lineItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.lineItems.map((item, index) => (
                  <div key={`${item.itemId}-${index}`} className="flex justify-between items-start border-b pb-4 last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Article ID: {item.articleId}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Qty: {item.quantity}</span>
                        {item.unitPrice && (
                          <span>Unit: {formatCurrency(item.unitPrice)}</span>
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
                        {item.lineTotal ? formatCurrency(item.lineTotal) : 'N/A'}
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
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(order.originalTotalPrice)}</span>
              </div>
              {order.totalPrice && order.totalPrice !== formatCurrency(order.originalTotalPrice) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Total (formatted):</span>
                  <span>{order.totalPrice}</span>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span>{order.totalPrice || formatCurrency(order.originalTotalPrice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Order Placed</p>
                  <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              {order.updatedAt !== order.createdAt && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-sm text-gray-600">{formatDate(order.updatedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {order.deliveryId && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Delivery ID: {order.deliveryId}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
