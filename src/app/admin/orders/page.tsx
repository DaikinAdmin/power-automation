"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, getOrderStatusBadgeStyle } from '@/helpers/formatting';

type OrderListItem = {
  id: string;
  status: string;
  totalPrice: string | null;
  originalTotalPrice: number;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  items: Array<{
    id: string;
    itemDetails: Array<{
      itemName: string | null;
    }>;
  }>;
};

interface OrdersResponse {
  orders: OrderListItem[];
  viewerRole: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/orders');

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to fetch orders' }));
          throw new Error(data.error || 'Failed to fetch orders');
        }

        const data = (await response.json()) as OrdersResponse;
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

  const orderStats = {
    total: orders.length,
    new: orders.filter(order => order.status === 'NEW').length,
    processing: orders.filter(order => order.status === 'PROCESSING').length,
    completed: orders.filter(order => order.status === 'COMPLETED').length,
    totalRevenue: orders
      .filter(order => order.status === 'COMPLETED')
      .reduce((sum, order) => sum + order.originalTotalPrice, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
        <p className="text-gray-600">
          Monitor and manage customer orders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.total}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.new}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{orderStats.processing}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(orderStats.totalRevenue)}</div>
                <p className="text-xs text-gray-600">
                  From {orderStats.completed} completed orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            A list of all customer orders.
          </CardDescription>
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
                  <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Items</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
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
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-28" />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoading && orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm">#{order.id.slice(-8)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{order.user?.name ?? '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {order.items.length} items
                        {order.items.length > 0 && order.items[0].itemDetails[0] && (
                          <div className="text-xs text-gray-600 truncate max-w-32">
                            {order.items[0].itemDetails[0].itemName}
                            {order.items.length > 1 && ` +${order.items.length - 1} more`}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {`${formatCurrency(order.originalTotalPrice)}${order.totalPrice ? ` (${order.totalPrice})` : ''}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusBadgeStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-900 text-sm">
                          View
                        </Link>
                        <button className="text-green-600 hover:text-green-900 text-sm">
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No orders found.
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
