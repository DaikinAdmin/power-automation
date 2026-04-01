import type { CardOption, DeliveryMethod, PaymentMethod } from "@/types/nova-poshta";

type TFn = (key: string) => string;

export function getDeliveryOptions(t: TFn): CardOption<DeliveryMethod>[] {
  return [
    {
      value: "warehouse",
      label: t("deliveryOption.warehouse.label"),
      description: t("deliveryOption.warehouse.description"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      value: "nova_dept",
      label: t("deliveryOption.nova_dept.label"),
      description: t("deliveryOption.nova_dept.description"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
      ),
    },
    {
      value: "nova_courier",
      label: t("deliveryOption.nova_courier.label"),
      description: t("deliveryOption.nova_courier.description"),
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 5v3h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
  ];
}

function onlineCardOption(t: TFn): CardOption<PaymentMethod> {
  return {
    value: "online_card",
    label: t("paymentOption.online_card.label"),
    description: t("paymentOption.online_card.description"),
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  };
}

function bankTransferOption(t: TFn): CardOption<PaymentMethod> {
  return {
    value: "bank_transfer",
    label: t("paymentOption.bank_transfer.label"),
    description: t("paymentOption.bank_transfer.description"),
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  };
}

function cashOnDeliveryOption(t: TFn): CardOption<PaymentMethod> {
  return {
    value: "cash_on_delivery",
    label: t("paymentOption.cash_on_delivery.label"),
    description: t("paymentOption.cash_on_delivery.description"),
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  };
}

function installmentOption(t: TFn): CardOption<PaymentMethod> {
  return {
    value: "installment",
    label: t("paymentOption.installment.label"),
    description: t("paymentOption.installment.description"),
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M7 15h2M12 15h2" />
      </svg>
    ),
  };
}

export function getPaymentOptions(t: TFn): Record<DeliveryMethod, CardOption<PaymentMethod>[]> {
  return {
    warehouse: [onlineCardOption(t), installmentOption(t), bankTransferOption(t)],
    nova_dept: [onlineCardOption(t), installmentOption(t), bankTransferOption(t), cashOnDeliveryOption(t)],
    nova_courier: [onlineCardOption(t), installmentOption(t), bankTransferOption(t), cashOnDeliveryOption(t)],
    "": [],
  };
}
