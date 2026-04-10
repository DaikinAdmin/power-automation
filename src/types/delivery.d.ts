// types/delivery.ts
import type { AddressFields } from '@/helpers/address';

export type DeliveryInfo = {
  name: string;
  phone: string;
  countryCode: string;
  vatNumber: string;
  address: AddressFields;
};

export type DeliveryRecord = {
  id: string;
  userId: string;
  orderId: string | null;
  type: string;
  city: string | null;
  cityRef: string | null;
  warehouseRef: string | null;
  warehouseDesc: string | null;
  street: string | null;
  building: string | null;
  flat: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
  };
};

/** @deprecated Use DeliveryRecord instead */
export type DeliveryItem = DeliveryRecord;

export type Stats = Record<string, number>;