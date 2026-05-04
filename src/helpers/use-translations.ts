'use client';

import { useTranslations } from 'next-intl';
import type { OrderStatus, PaymentStatus } from '@/db/schema';
import type { DeliveryStatus, DeliveryType } from '@/helpers/delivery';


// Helper for client translations related to orders and deliveries
export function useOrderTranslations() {
  const t = useTranslations('translations');

  return {
    statusLabel: (status: OrderStatus) =>
      t(`orderStatuses.${status}` as Parameters<typeof t>[0]),
    paymentStatusLabel: (status: PaymentStatus) =>
      t(`paymentStatuses.${status}` as Parameters<typeof t>[0]),
  };
}

export function useDeliveryTranslations() {
  const t = useTranslations('translations');

  return {
    statusLabel: (status: DeliveryStatus) =>
      t(`deliveryStatuses.${status}` as Parameters<typeof t>[0]),
    typeLabel: (type: DeliveryType) =>
      t(`deliveryTypes.${type}` as Parameters<typeof t>[0]),
  };
}
