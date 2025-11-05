import { OrderStatus } from '@prisma/client';

export const formatCurrency = (amount: number): string => {
  return `${amount.toFixed(2)} €`;
};

export const formatDate = (
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return parsedDate.toLocaleString('en-US', options ?? defaultOptions);
};

export const getOrderStatusStyle = (status: OrderStatus | string): string => {
  const mapping: Record<string, string> = {
    NEW: 'text-blue-500',
    WAITING_FOR_PAYMENT: 'text-amber-500',
    PROCESSING: 'text-purple-500',
    COMPLETED: 'text-green-500',
    CANCELLED: 'text-red-500',
    REFUND: 'text-gray-500',
  };

  return mapping[status] || 'text-gray-500';
};

export const getOrderStatusBadgeStyle = (status: OrderStatus | string): string => {
  const mapping: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    WAITING_FOR_PAYMENT: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    REFUND: 'bg-purple-100 text-purple-800',
  };

  return mapping[status] || 'bg-gray-100 text-gray-800';
};
