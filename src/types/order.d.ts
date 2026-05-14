import type { OrderLineItem } from '@/app/api/orders/shared';
import type { OrderStatus } from '@/db/schema';
import type { DeliveryStatus } from '@/db/schema';
import type { DeliveryType } from '@/helpers/delivery';
import type { PaymentStatus } from '@/db/schema';

export type { OrderLineItem };


export type Delivery = {
  type: DeliveryType;
  city: string | null;
  warehouseDesc: string | null;
  street: string | null;
  building: string | null;
  flat: string | null;
  trackingNumber: string | null;
  status: DeliveryStatus;
};

export type Payment = {
  id?: string;
  status: PaymentStatus;
  currency: string;
  amount: number;
  paymentMethod?: string | null;
  sessionId?: string | null;
  transactionId?: string | null;
  provider?: string | null;
  updatedAt?: string | null;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  currency: string | null;
  totalNet: number | null;
  totalVat: number | null;
  totalGross: number | null;
  deliveryId?: string | null;
  delivery?: DeliveryType | null;
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
  status: OrderStatus;
  currency: string | null;
  totalNet: number | null;
  totalVat: number | null;
  totalGross: number | null;
  createdAt: string;
  lineItems: OrderLineItem[];
  payment?: Payment | null;
};

export type PaymentRecord = {
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

export type FetchState = 'idle' | 'loading' | 'loaded' | 'error' | 'not_found';
