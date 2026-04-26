// Types used by the admin export modal and export API

export interface ExportField {
  key: string;
  label: string;
  group: "basic" | "pricing" | "meta" | "category";
}

export interface ExportWarehousePrice {
  warehouseSlug: string;
  priceWithoutVAT: number;
  priceWithVAT: number;
  initialPrice: number;
  initialPriceCurrency: string;
  quantity: number;
  promotionPrice: number | null;
  badge: string;
  margin: number;
  warehouse: { displayedName: string; name: string };
}

export interface ExportItemDetails {
  locale: string;
  itemName: string;
  description: string;
  specifications: string;
  seller: string;
  discount: number | null;
  popularity: number | null;
  metaKeyWords: string;
  metaDescription: string;
}

export interface ExportItem {
  articleId: string;
  slug: string;
  isDisplayed: boolean;
  sellCounter: number;
  categorySlug: string;
  brandSlug: string;
  warrantyType: string;
  warrantyLength: number;
  createdAt: string;
  updatedAt: string;
  details: ExportItemDetails;
  prices: ExportWarehousePrice[];
}
