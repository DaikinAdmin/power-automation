export type DeliveryMethod = "warehouse" | "nova_dept" | "nova_courier" | "";
export type PaymentMethod = "online_card" | "cash_on_delivery" | "bank_transfer" | "installment" | "";

export interface NpCity {
  ref: string;
  name: string;
  settlementType: string;
}

export interface NpWarehouse {
  ref: string;
  number: string;
  description: string;
  shortAddress: string;
  postMachineType: string;
}

export interface NovaPostDeliveryState {
  method: DeliveryMethod;
  payment: PaymentMethod;
  city: NpCity | null;
  warehouseRef: string;
  warehouseDesc: string;
  street: string;
  building: string;
  flat: string;
  isValid: boolean;
}

export interface CardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon: React.ReactNode;
}

export interface InputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}
