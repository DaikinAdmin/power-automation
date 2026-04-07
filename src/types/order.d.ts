import type { OrderLineItem } from '@/app/api/orders/shared';

export type { OrderLineItem };

export type Payment = {
  id: string;
  status: string;
  currency: string;
  amount: number;
  paymentMethod?: string | null;
  sessionId?: string | null;
  transactionId?: string | null;
};

export type OrderDetail = {
  id: string;
  status: string;
  originalTotalPrice: number;
  totalPrice: string | null;
  deliveryId?: string | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
  } | null;
  lineItems: OrderLineItem[] | null;
  payment?: Payment | null;
};

export type OrderListItem = {
  id: string;
  status: string;
  totalPrice: string | null;
  originalTotalPrice: number;
  createdAt: string;
  lineItems: OrderLineItem[];
  payment?: Payment | null;
};

export type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';
