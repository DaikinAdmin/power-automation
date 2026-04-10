export const DELIVERY_STATUSES = [
  'PENDING',
  'PROCESSING',
  'IN_TRANSIT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export function isValidDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUSES as readonly string[]).includes(value);
}
