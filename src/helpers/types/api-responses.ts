// API Response Types for Drizzle-based endpoints

// ==================== Category Types ====================
export interface CategoryResponse {
  slug: string;
  name: string;
  isVisible: boolean;
  imageLink: string;
  createdAt: string;
  updatedAt: string;
  subCategories: SubCategoryResponse[];
}

export interface SubCategoryResponse {
  slug: string;
  name: string;
  categorySlug: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTranslationResponse {
  categorySlug: string;
  locale: string;
  name: string;
}

export interface SubCategoryTranslationResponse {
  subCategorySlug: string;
  locale: string;
  name: string;
}

// ==================== Item Types ====================
export interface ItemPriceResponse {
  warehouseSlug: string;
  price: number;
  quantity: number;
  promotionPrice: number | null;
  promoCode: string | null;
  promoEndDate: string | null;
  badge: string | null;
  warehouse: WarehouseResponse;
}

export interface ItemDetailsResponse {
  locale: string;
  itemName: string;
  description: string;
  specifications: string | null;
  seller: string | null;
  discount: number | null;
  popularity: number | null;
  metaKeyWords: string | null;
  metaDescription: string | null;
}

export interface ItemResponse {
  articleId: string;
  isDisplayed: boolean;
  sellCounter: number | null;
  itemImageLink: string[];
  categorySlug: string;
  subCategorySlug: string | null;
  brandSlug: string | null;
  warrantyType: string | null;
  warrantyLength: number | null;
  createdAt: string;
  updatedAt: string;
  details: ItemDetailsResponse;
  prices: ItemPriceResponse[];
  brand: BrandResponse | null;
  category: CategoryResponse;
}

export interface ItemListResponse {
  articleId: string;
  itemName: string;
  description: string;
  itemImageLink: string[];
  brandSlug: string | null;
  brandName: string | null;
  categorySlug: string;
  price: number;
  promotionPrice: number | null;
  quantity: number;
  badge: 'NEW_ARRIVALS' | 'BESTSELLER' | 'HOT_DEALS' | 'LIMITED_EDITION' | 'ABSENT' | null;
  warehouseSlug: string;
}

// ==================== Brand Types ====================
export interface BrandResponse {
  alias: string;
  name: string;
  imageLink: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== Warehouse Types ====================
export interface WarehouseResponse {
  id?: string;
  slug: string;
  name: string | null;
  displayedName: string;
  countrySlug: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  country: WarehouseCountryResponse | null;
}

export interface WarehouseCountryResponse {
  slug: string;
  name: string;
  countryCode: string;
  phoneCode: string | null;
  isActive: boolean;
}

// ==================== Order Types ====================
export interface OrderItemResponse {
  articleId: string;
  itemName: string;
  quantity: number;
  price: number;
  warehouseSlug: string;
}

export interface OrderResponse {
  orderId: string;
  userId: string;
  totalPrice: string;
  originalTotalPrice: number;
  status: string;
  deliveryId: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  orderId: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  itemCount: number;
}

// ==================== User Types ====================
export interface UserResponse {
  userId: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  companyName: string | null;
  phoneNumber: string;
  countryCode: string | null;
  discountLevel: number | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  userId: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  companyName: string | null;
  discountLevel: number | null;
  createdAt: string;
}

// ==================== Discount Level Types ====================
export interface DiscountLevelResponse {
  discountLevelId: string;
  level: number;
  discountPercentage: number;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

// ==================== Dashboard Stats Types ====================
export interface DashboardStatsResponse {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalItems: number;
  recentOrdersCount: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
}

export interface RecentOrderResponse {
  orderId: string;
  userName: string;
  userEmail: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  itemCount: number;
}

// ==================== Currency Exchange Types ====================
export interface CurrencyExchangeResponse {
  from: string;
  to: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== Search Types ====================
export interface SearchResultItem {
  articleId: string;
  itemName: string;
  description: string;
  itemImageLink: string[];
  brandSlug: string | null;
  brandName: string | null;
  categorySlug: string;
  price: number;
  promotionPrice: number | null;
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== Out of Stock Request Types ====================
export interface OutOfStockRequestResponse {
  requestId: string;
  articleId: string;
  warehouseSlug: string;
  userEmail: string;
  userName: string | null;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Generic Response Wrappers ====================
export interface ApiSuccessResponse<T> {
  data: T;
  success: true;
}

export interface ApiErrorResponse {
  error: string;
  success: false;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
