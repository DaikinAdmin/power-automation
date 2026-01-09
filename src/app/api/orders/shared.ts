export type OrderLineItem = {
  itemId: string;
  articleId: string;
  name: string;
  quantity: number;
  warehouseId: string;
  warehouseName?: string | null;
  warehouseDisplayedName?: string | null;
  warehouseCountry?: string | null;
  basePrice?: number | null;
  baseSpecialPrice?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
};

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
    totalPrice: order.totalPrice,
    originalTotalPrice: order.originalTotalPrice,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryId: order.deliveryId,
    lineItems: Array.isArray(order.lineItems)
      ? order.lineItems
      : order.items?.map((item: any) => ({
          itemId: item.id,
          articleId: item.articleId,
          name: item.itemDetails?.[0]?.itemName || item.brandName || item.articleId,
          quantity: 1, // This would come from the lineItems JSON if available
          unitPrice: item.itemPrice?.[0]?.promotionPrice || item.itemPrice?.[0]?.price,
          lineTotal: item.itemPrice?.[0]?.promotionPrice || item.itemPrice?.[0]?.price,
          warehouseId: item.itemPrice?.[0]?.warehouse?.id,
          warehouseName: item.itemPrice?.[0]?.warehouse?.name,
          warehouseDisplayedName: item.itemPrice?.[0]?.warehouse?.displayedName,
          warehouseCountry: item.itemPrice?.[0]?.warehouse?.country,
        })) || [],
  };
}