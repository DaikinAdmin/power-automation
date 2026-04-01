// types/delivery.ts

export type DeliveryItem = {
  id: string;
  userId: string;
  orderId: string | null;
  type: string;
  city: string | null;
  warehouseDesc: string | null;
  street: string | null;
  building: string | null;
  flat: string | null;
  trackingNumber: string | null;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string | null;
    phoneNumber: string | null;
    countryCode: string | null;
  };
};

export type Stats = Record<string, number>;