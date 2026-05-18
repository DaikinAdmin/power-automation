import type React from 'react';

export type PolandDeliveryMethod = 'pickup' |'parcel_locker_inpost' | 'courier_inpost' | 'dpd_parcel' | '';
export type PolandPaymentMethod = 'przelewy24' | 'bank_transfer' | '';

export interface InPostPoint {
  name: string;
  address_details: {
    city: string;
    street: string;
    building_number: string;
  };
}

export interface PolandDeliveryState {
  method: PolandDeliveryMethod;
  payment: PolandPaymentMethod;
  selectedPoint: InPostPoint | null;
  dpdPointId: string | null;
  street: string;
  building: string;
  flat: string;
  city: string;
  postalCode: string;
  isValid: boolean;
  deliveryPrice: number;
}

export interface CardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon: React.ReactNode;
}
