export type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  // Stored financial fields
  originalCurrency?: string | null;
  vatRate?: number | null;
  exchangeRate?: number | null;
  basePriceNet?: number | null;
  specialPriceNet?: number | null;
  unitPriceNet?: number | null;
  // Derived fields (computed in API, not stored in DB)
  unitPriceGrossConverted?: number | null;
  lineTotalNet?: number | null;
  lineTotalNetConverted?: number | null;
  lineVatConverted?: number | null;
  lineTotalGrossConverted?: number | null;
};

export function computeLineItemDerived(item: OrderLineItem): OrderLineItem {
  const unitPriceNet = item.unitPriceNet ?? 0;
  const exchangeRate = item.exchangeRate ?? 1;
  const vatRate = item.vatRate ?? 0;
  const quantity = item.quantity ?? 1;
  const lineTotalNet = +(unitPriceNet * quantity).toFixed(6);
  const lineTotalNetConverted = +(lineTotalNet * exchangeRate).toFixed(2);
  const lineVatConverted = +(lineTotalNetConverted * vatRate).toFixed(2);
  const lineTotalGrossConverted = +(lineTotalNetConverted + lineVatConverted).toFixed(2);
  // Compute unit gross via the same rounding path as line total (not directly from raw net)
  // to avoid 1-cent discrepancy when quantity = 1
  const unitPriceNetConverted = +(unitPriceNet * exchangeRate).toFixed(2);
  const unitVatConverted = +(unitPriceNetConverted * vatRate).toFixed(2);
  const unitPriceGrossConverted = +(unitPriceNetConverted + unitVatConverted).toFixed(2);
  return { ...item, lineTotalNet, lineTotalNetConverted, lineVatConverted, lineTotalGrossConverted, unitPriceGrossConverted };
}

export const parseStoredLineItems = (value: unknown): OrderLineItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is OrderLineItem => typeof item === 'object' && item !== null) as OrderLineItem[];
};

export function mapOrderForUser(order: any) {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency ?? null,
    totalNet: order.totalNet ?? null,
    totalVat: order.totalVat ?? null,
    totalGross: order.totalGross ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryId: order.deliveryId,
    delivery: order.delivery ?? null,
    payment: order.payment ?? null,
    lineItems: Array.isArray(order.lineItems)
      ? (order.lineItems as OrderLineItem[]).map(computeLineItemDerived)
      : [],
  };
}