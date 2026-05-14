import type React from 'react';

export type InPostDeliveryMethod = 'parcel_locker' | 'courier' | '';

export interface InPostPoint {
  name: string;
  address_details: {
    city: string;
    street: string;
    building_number: string;
  };
}

export interface InPostDeliveryState {
  method: InPostDeliveryMethod;
  selectedPoint: InPostPoint | null;
  street: string;
  city: string;
  postalCode: string;
  isValid: boolean;
}

export interface CardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon: React.ReactNode;
}
