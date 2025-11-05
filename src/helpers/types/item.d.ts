import {
  Category as CategoryType,
  ItemDetails as PrismaItemDetails,
  ItemPrice as ItemPriceType,
  Item as ItemType,
  SubCategories,
  Warehouse,
  Brand,
  ItemPriceHistory as PrismaItemPriceHistory,
} from '@prisma/client';

export type ItemPrice = ItemPriceType & {
  warehouse: Warehouse;
  history?: ItemPriceHistory[];
}

export type ItemPriceHistory = PrismaItemPriceHistory & {
  warehouse: Warehouse;
}

export type ItemDetail = PrismaItemDetails;

export type Category = CategoryType & {
  subCategories: SubCategories[]
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
  articleId: string;
  itemImageLink: string | null;
  image: string | null;
  isDisplayed: boolean;
  sellCounter: number | null;
  categoryId: string;
  subCategoryId: string;
  category: string;
  categorySlug: string;
  subcategory: string;
  name: string;
  brand: string;
  brandId?: string | null;
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