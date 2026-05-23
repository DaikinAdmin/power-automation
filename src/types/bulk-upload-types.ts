export interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
  details?: string[];
}

export interface ParsedData {
  headers: string[];
  rows: any[][];
}

export type MandatoryField = "articleId";
export type OptionalField =
  | "price"
  | "quantity"
  | "badge"
  | "margin"
  | "initialCurrency"
  | "promoCode"
  | "promoStartDate"
  | "promoEndDate"
  | "promoPrice";
export type TranslationField =
  | "name_pl"
  | "name_ua"
  | "name_en"
  | "name_es"
  | "description_pl"
  | "description_ua"
  | "description_en"
  | "description_es"
  | "specifications_pl"
  | "specifications_ua"
  | "specifications_en"
  | "specifications_es"
  | "metaDescription_pl"
  | "metaDescription_ua"
  | "metaDescription_en"
  | "metaDescription_es"
  | "metaKeywords_pl"
  | "metaKeywords_ua"
  | "metaKeywords_en"
  | "metaKeywords_es";
export type ItemField =
  | "imageUrl"
  | "seller"
  | "alias"
  | "isDisplayed"
  | "brand"
  | "categorySlug";
export type FieldType = MandatoryField | OptionalField | TranslationField | ItemField;

export interface ColumnMapping {
  articleId: number | null;
  quantity: number | null;
  price: number | null;
  badge: number | null;
  brand: number | null;
  margin: number | null;
  promoCode: number | null;
  promoStartDate: number | null;
  promoEndDate: number | null;
  promoPrice: number | null;
  initialCurrency: number | null;
  name_pl: number | null;
  name_ua: number | null;
  name_en: number | null;
  name_es: number | null;
  description_pl: number | null;
  description_ua: number | null;
  description_en: number | null;
  description_es: number | null;
  specifications_pl: number | null;
  specifications_ua: number | null;
  specifications_en: number | null;
  specifications_es: number | null;
  metaDescription_pl: number | null;
  metaDescription_ua: number | null;
  metaDescription_en: number | null;
  metaDescription_es: number | null;
  metaKeywords_pl: number | null;
  metaKeywords_ua: number | null;
  metaKeywords_en: number | null;
  metaKeywords_es: number | null;
  imageUrl: number | null;
  seller: number | null;
  alias: number | null;
  isDisplayed: number | null;
  categorySlug: number | null;
}

export interface Warehouse {
  id: string;
  name: string;
  displayedName: string;
}

export type Currency = "EUR" | "PLN" | "UAH";
export type UploadMode = "prices" | "descriptions";

export const EMPTY_COLUMN_MAPPING: ColumnMapping = {
  articleId: null,
  quantity: null,
  price: null,
  badge: null,
  brand: null,
  margin: null,
  promoCode: null,
  promoStartDate: null,
  promoEndDate: null,
  promoPrice: null,
  initialCurrency: null,
  name_pl: null,
  name_ua: null,
  name_en: null,
  name_es: null,
  description_pl: null,
  description_ua: null,
  description_en: null,
  description_es: null,
  specifications_pl: null,
  specifications_ua: null,
  specifications_en: null,
  specifications_es: null,
  metaDescription_pl: null,
  metaDescription_ua: null,
  metaDescription_en: null,
  metaDescription_es: null,
  metaKeywords_pl: null,
  metaKeywords_ua: null,
  metaKeywords_en: null,
  metaKeywords_es: null,
  imageUrl: null,
  seller: null,
  alias: null,
  isDisplayed: null,
  categorySlug: null,
};

export const mandatoryFields: { key: MandatoryField; label: string }[] = [
  { key: "articleId", label: "Article ID" },
];

export const optionalFields: { key: OptionalField; label: string }[] = [
  { key: "price", label: "Initial Price" },
  { key: "quantity", label: "Quantity" },
  { key: "badge", label: "Badge" },
  { key: "margin", label: "Margin" },
  { key: "initialCurrency", label: "Initial Currency" },
  { key: "promoCode", label: "Promo Code" },
  { key: "promoPrice", label: "Promo Price" },
  { key: "promoStartDate", label: "Promo Start Date" },
  { key: "promoEndDate", label: "Promo End Date" },
];

export const translationFields: { key: TranslationField; label: string }[] = [
  { key: "name_pl", label: "Name (PL)" },
  { key: "name_ua", label: "Name (UA)" },
  { key: "name_en", label: "Name (EN)" },
  { key: "name_es", label: "Name (ES)" },
  { key: "description_pl", label: "Description (PL)" },
  { key: "description_ua", label: "Description (UA)" },
  { key: "description_en", label: "Description (EN)" },
  { key: "description_es", label: "Description (ES)" },
  { key: "specifications_pl", label: "Specifications (PL)" },
  { key: "specifications_ua", label: "Specifications (UA)" },
  { key: "specifications_en", label: "Specifications (EN)" },
  { key: "specifications_es", label: "Specifications (ES)" },
  { key: "metaDescription_pl", label: "Meta Desc (PL)" },
  { key: "metaDescription_ua", label: "Meta Desc (UA)" },
  { key: "metaDescription_en", label: "Meta Desc (EN)" },
  { key: "metaDescription_es", label: "Meta Desc (ES)" },
  { key: "metaKeywords_pl", label: "Meta KW (PL)" },
  { key: "metaKeywords_ua", label: "Meta KW (UA)" },
  { key: "metaKeywords_en", label: "Meta KW (EN)" },
  { key: "metaKeywords_es", label: "Meta KW (ES)" },
];

export const itemFields: { key: ItemField; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "categorySlug", label: "Category Slug" },
  { key: "imageUrl", label: "Image URLs" },
  { key: "seller", label: "Seller" },
  { key: "alias", label: "Alias" },
  { key: "isDisplayed", label: "Is Displayed" },
];
