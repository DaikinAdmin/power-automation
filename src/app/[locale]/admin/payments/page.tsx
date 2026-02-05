"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Payment = {
  id: string;
  sessionId: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    status: string;
    totalPrice: number;
  } | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

interface PaymentsResponse {
  payments: Payment[];
  viewerRole: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/admin/payments?${params}`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to fetch payments' }));
        throw new Error(data.error || 'Failed to fetch payments');
      }

      const data = (await response.json()) as PaymentsResponse;
      setPayments(data.payments ?? []);
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.order?.id.toLowerCase().includes(searchLower) ||
        payment.user?.email?.toLowerCase().includes(searchLower) ||
        payment.sessionId?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment? This action cannot be undone.')) {
      return;
    }

    setRefundingPaymentId(paymentId);
    try {
      const response = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      // Reload payments to show updated status
      await loadPayments();
      alert('Refund processed successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setRefundingPaymentId(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    // Amount is in grosze/cents, convert to main currency
    const mainAmount = amount / 100;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: currency || 'PLN',
    }).format(mainAmount);
  };

  const getStatusBadgeStyle = (status: string) => {
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

  const paymentStats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'COMPLETED').length,
    failed: payments.filter(p => p.status === 'FAILED' || p.status === 'CANCELLED').length,
    refunded: payments.filter(p => p.status === 'REFUNDED').length,
    totalRevenue: payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments Management</h1>
        <p className="text-gray-600">
          Monitor and manage payment transactions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{paymentStats.total}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-green-600">{paymentStats.completed}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-red-600">{paymentStats.failed}</div>}
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
              <div className="text-2xl font-bold">{formatAmount(paymentStats.totalRevenue, 'PLN')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            Search and filter payment transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by email or order ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="INITIATED">Initiated</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button
              onClick={loadPayments}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-sm">Order ID</th>
                    <th className="text-left p-3 font-semibold text-sm">Client Email</th>
                    <th className="text-left p-3 font-semibold text-sm">Amount</th>
                    <th className="text-left p-3 font-semibold text-sm">Payment Status</th>
                    <th className="text-left p-3 font-semibold text-sm">Order Status</th>
                    <th className="text-left p-3 font-semibold text-sm">Date</th>
                    <th className="text-left p-3 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {payment.order ? (
                          <Link
                            href={`/admin/orders/${payment.order.id}`}
                            className="text-blue-600 hover:underline font-mono text-sm"
                          >
                            ...{payment.order.id.slice(-6)}
                          </Link>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="p-3">
                        {payment.user?.email || (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        {formatAmount(payment.amount, payment.currency)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {payment.order?.status ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(payment.order.status)}`}>
                            {payment.order.status}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(payment.createdAt).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="p-3">
                        {payment.order?.status === 'REFUND' && payment.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleRefund(payment.id)}
                            disabled={refundingPaymentId === payment.id}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {refundingPaymentId === payment.id ? 'Processing...' : 'Refund'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
