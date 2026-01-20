'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { OrderStatus } from '@/db/schema';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  PlusCircle, 
  List, 
  Clock, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getOrderStatusStyle } from '@/helpers/formatting';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalItems: number;
  revenue: number;
  userGrowth: number;
  orderGrowth: number;
  itemGrowth: number;
  revenueGrowth: number;
}

interface Order {
  id: string;
  customerName: string;
  originalTotalPrice: number;
  totalPriceFormatted: string;
  status: OrderStatus;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard statistics
        const statsResponse = await fetch('/api/admin/dashboard/stats');
        if (!statsResponse.ok) throw new Error('Failed to fetch statistics');
        const statsData = await statsResponse.json();
        
        // Fetch recent orders
        const ordersResponse = await fetch('/api/admin/dashboard/recent-orders');
        if (!ordersResponse.ok) throw new Error('Failed to fetch recent orders');
        const ordersData = await ordersResponse.json();
        
        setStats(statsData);
        setRecentOrders(ordersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error("Error", {
          description: "Failed to load dashboard data. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-gray-600">
          Overview of your business performance and recent activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-gray-600">
                  {stats && stats.userGrowth > 0 ? '+' : ''}{stats?.userGrowth.toFixed(1)}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Total Orders Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalOrders.toLocaleString()}</div>
                <p className="text-xs text-gray-600">
                  {stats && stats.orderGrowth > 0 ? '+' : ''}{stats?.orderGrowth.toFixed(1)}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Total Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalItems.toLocaleString()}</div>
                <p className="text-xs text-gray-600">
                  {stats && stats.itemGrowth > 0 ? '+' : ''}{stats?.itemGrowth.toFixed(1)}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.revenue || 0)}</div>
                <p className="text-xs text-gray-600">
                  {stats && stats.revenueGrowth > 0 ? '+' : ''}{stats?.revenueGrowth.toFixed(1)}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Orders</span>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              {isLoading ? (
                <Skeleton className="h-4 w-full max-w-[250px]" />
              ) : (
                `You have ${recentOrders.length} recent orders to process.`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <Link 
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Order #{order.id.slice(-5)}</p>
                      <p className="text-sm text-gray-600">
                        {order.customerName} - {order.totalPriceFormatted || formatCurrency(order.originalTotalPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${getOrderStatusStyle(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">No recent orders found.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks and shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link href="/admin/products/new">
                <Button variant="outline" className="w-full justify-start text-left">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="text-sm">Add New Product</span>
                </Button>
              </Link>
              
              <Link href="/admin/categories">
                <Button variant="outline" className="w-full justify-start text-left">
                  <List className="mr-2 h-4 w-4" />
                  <span className="text-sm">Manage Categories</span>
                </Button>
              </Link>
              
              <Link href="/admin/orders?status=NEW">
                <Button variant="outline" className="w-full justify-start text-left">
                  <Clock className="mr-2 h-4 w-4" />
                  <span className="text-sm">Process Pending Orders</span>
                </Button>
              </Link>
              
              <Link href="/admin/currency-exchange">
                <Button variant="outline" className="w-full justify-start text-left">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span className="text-sm">Update Currency Exchange Rates</span>
                </Button>
              </Link>
              
              <Link href="/admin/reports">
                <Button variant="outline" className="w-full justify-start text-left">
                  <FileText className="mr-2 h-4 w-4" />
                  <span className="text-sm">Generate Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
