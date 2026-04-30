import type { OrderLineItem } from '@/app/api/orders/shared';

export type { OrderLineItem };

export type Delivery = {
  type: string;
  city: string | null;
  warehouseDesc: string | null;
  street: string | null;
  building: string | null;
  flat: string | null;
  trackingNumber: string | null;
  status: string;
};

export type Payment = {
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
  currency: string | null;
  totalNet: number | null;
  totalVat: number | null;
  totalGross: number | null;
  deliveryId?: string | null;
  delivery?: Delivery | null;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
    vatNumber?: string | null;
    companyName?: string | null;
    userType?: string | null;
    addressLine?: string | null;
  } | null;
  lineItems: OrderLineItem[] | null;
  notes?: OrderNote[] | null;
  payment?: Payment | null;
};

export type OrderNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type OrderListItem = {
  id: string;
  status: string;
  currency: string | null;
  totalNet: number | null;
  totalVat: number | null;
  totalGross: number | null;
  createdAt: string;
  lineItems: OrderLineItem[];
  payment?: Payment | null;
};

export type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';
