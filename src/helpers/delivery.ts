import { DELIVERY_STATUS_OPTIONS, DELIVERY_TYPE_OPTIONS } from "@/constants/delivery";


export type DeliveryStatus = (typeof DELIVERY_STATUS_OPTIONS)[number];
export type DeliveryType = (typeof DELIVERY_TYPE_OPTIONS)[number];

export function isValidDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isValidDeliveryType(value: string): value is DeliveryType {
  return (DELIVERY_TYPE_OPTIONS as readonly string[]).includes(value);
}
