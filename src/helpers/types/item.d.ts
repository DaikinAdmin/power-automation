import { Item as ItemType, ItemPrice as ItemPriceType, ItemPriceHistory as ItemPriceHistoryType, ItemDetails as ItemDetailsType, Category as CategoryType, Warehouse, SubCategories, CategoryTranslation, Brand } from '@/db/schema';

export type ItemPrice = ItemPriceType & {
  warehouse: Warehouse;
  history?: ItemPriceHistory[];
}

export type ItemPriceHistory = ItemPriceHistoryType & {
  warehouse: Warehouse;
}

export type ItemDetail = ItemDetailsType;

export type Category = CategoryType & {
  subCategories: SubCategories[]
  categoryTranslations: CategoryTranslation[]
}

export type Item = ItemType & {
  itemDetails: ItemDetail[],
  itemPrice: ItemPrice[],
  item_details?: ItemDetail,
  item_price?: ItemPrice,
  category: Category,
  subCategory: SubCategories,
  brand?: Brand | null
}

export type ProductWarehouse = {
  warehouseId: string;
  warehouseName: string;
  warehouseCountry: string;
  displayedName: string;
  price: string;
  specialPrice: string | null;
  originalPrice: string;
  inStock: boolean;
  quantity: number;
  badge: string | null;
};

export type ProductRecommendedWarehouse = {
  warehouse: {
    id: string;
    name: string | null;
    country: string | null;
    displayedName: string;
  };
  price: number;
  promotionPrice: number | null;
  quantity: number;
  badge: string | null;
};

export type ProductDetailsResponse = {
  id: string;
  slug: string;
  alias?: string;
  articleId: string;
  itemImageLink: string[];
  image: string | null;
  isDisplayed: boolean;
  sellCounter: number | null;
  categorySlug: string;
  subCategorySlug: string;
  category: string;
  subcategory: string;
  name: string;
  brand: string;
  brandSlug?: string | null;
  brandAlias?: string | null;
  brandImage?: string | null;
  description: string;
  badge: 'bestseller' | 'discount' | 'new' | null;
  warrantyMonths: number;
  warrantyType?: string | null;
  warehouses: ProductWarehouse[];
  recommendedWarehouse?: ProductRecommendedWarehouse;
  itemDetails: Array<{
    id: string;
    locale: string;
    itemName: string;
    description: string | null;
    specifications: string | null;
    seller: string | null;
    discount: number | null;
    popularity: number | null;
    metaKeyWords?: string | null;
    metaDescription?: string | null;
  }>;
};

export type CartItemType = Item & {
  quantity: number;
  warehouseId?: string;
  displayName?: string;
  price?: number;
  specialPrice?: number;
  basePrice?: number;
  baseSpecialPrice?: number;
  availableWarehouses?: Array<{
    warehouseId: string;
    warehouseName: string;
    warehouseCountry: string;
    displayName?: string;
    price: number;
    specialPrice?: number;
    basePrice?: number;
    baseSpecialPrice?: number;
    inStock: boolean;
    quantity: number;
  }>;
};


export interface UploadType {
  articleId: string;
  isDisplayed: boolean;
  itemImageLink: string;
  categoryName: string;
  subCategoryName: string;
  brandName: string;
  warrantyType: string;
  warrantyLength: number;
  sellCounter: number;
  locale: string;
  itemName: string;
  description: string;
  specifications: string;
  seller: string;
  discount: number;
  popularity: number;
  warehouseName: string;
  price: number;
  quantity: number;
  promotionPrice: number;
  promoCode: string;
  promoEndDate: string;
  badge: string;
}

export type BulkUploadItem = Omit<Item, 'itemDetails', 'itemPrice'>;

export interface ItemDetailResponse {
  id: number;
  articleId: string;
  itemImageLink: string | null;
  isDisplayed: boolean;
  sellCounter: number;
  createdAt: Date;
  updatedAt: Date;
  prices: Array<{
    warehouseId: number;
    warehouseName: string;
    warehouseCountry: string;
    displayedName: string;
    price: string;
    specialPrice: string | null;
    originalPrice: string;
    inStock: boolean;
    quantity: number;
    badge: string | null;
    promoEndDate: Date | null;
    promoCode: string | null;
  }>;
  name: string;
  brandName: string | null;
  brandImage: string | null;
  description: string;
  specifications: string;
  seller: string;
  discount: number;
  popularity: number;
  badge: string | null;
  warrantyMonths: number;
  warrantyType: string | null;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string[];
  subcategorySlug: string[];
  itemDetails: Array<{
    id: number;
    locale: string;
    itemName: string | null;
    description: string | null;
    specifications: string | null;
    seller: string | null;
    discount: number | null;
    popularity: number | null;
  }>;
  recommendedWarehouse?: {
    warehouse: {
      id: number;
      name: string;
      country: string;
      displayedName: string;
    };
    price: number;
    promotionPrice: number | null;
    quantity: number;
    badge: string | null;
  };
}