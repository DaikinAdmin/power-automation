// Server-side queries for category page data
import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getItemsByLocale } from './items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';

export interface CategoryPageData {
  items: ItemResponse[];
  categories: CategoryInfo[];
  brands: BrandInfo[];
  warehouses: WarehouseInfo[];
  subcategories: SubcategoryInfo[];
  pagination: PaginationInfo;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: SubcategoryInfo[];
}

export interface SubcategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface BrandInfo {
  name: string;
  slug: string;
}

export interface WarehouseInfo {
  id: string;
  name: string;
  country: string;
  displayedName: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CategoryFilters {
  subcategory?: string[];
  brand?: string[];
  warehouse?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Fetches all data needed for the category page in a single optimized query
 */
export async function getCategoryPageData(
  locale: string,
  categorySlug: string,
  filters: CategoryFilters = {},
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<CategoryPageData> {
  // Fetch all items for the locale
  const allItems = await getItemsByLocale(locale);
  
  // Filter by category
  let categoryItems = allItems.filter(item => item.category.slug === categorySlug);
  
  // Apply filters
  if (filters.subcategory && filters.subcategory.length > 0) {
    categoryItems = categoryItems.filter(item =>
      item.subCategorySlug && filters.subcategory!.includes(item.subCategorySlug)
    );
  }
  
  if (filters.brand && filters.brand.length > 0) {
    categoryItems = categoryItems.filter(item =>
      item.brand?.alias && filters.brand!.includes(item.brand.alias)
    );
  }
  
  if (filters.warehouse && filters.warehouse.length > 0) {
    categoryItems = categoryItems.filter(item =>
      item.prices.some(price => filters.warehouse!.includes(price.warehouse.slug))
    );
  }
  
  // Calculate pagination
  const totalItems = categoryItems.length;
  const totalPages = Math.ceil(totalItems / pagination.limit);
  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = startIndex + pagination.limit;
  const paginatedItems = categoryItems.slice(startIndex, endIndex);
  
  // Extract categories
  const categoryMap = new Map<string, CategoryInfo>();
  allItems.forEach(item => {
    if (item.category && !categoryMap.has(item.category.slug)) {
      categoryMap.set(item.category.slug, {
        id: item.category.slug,
        name: item.category.name,
        slug: item.category.slug,
        image: '/placeholder-category.jpg',
        subcategories: item.category.subCategories.map(sub => ({
          id: sub.slug,
          name: sub.name,
          slug: sub.slug,
        })),
      });
    }
  });
  
  // Get subcategories for current category
  const currentCategory = categoryMap.get(categorySlug);
  const subcategories = currentCategory?.subcategories || [];
  
  // Extract brands (only from current category items)
  const brandMap = new Map<string, BrandInfo>();
  const unfilteredCategoryItems = allItems.filter(item => item.category.slug === categorySlug);
  unfilteredCategoryItems.forEach(item => {
    if (item.brand?.alias && item.brand?.name) {
      brandMap.set(item.brand.alias, {
        name: item.brand.name,
        slug: item.brand.alias,
      });
    }
  });
  
  // Extract warehouses (only from current category items)
  const warehouseMap = new Map<string, WarehouseInfo>();
  unfilteredCategoryItems.forEach(item => {
    item.prices.forEach(price => {
      if (price.warehouse) {
        warehouseMap.set(price.warehouse.slug, {
          id: price.warehouse.slug,
          name: price.warehouse.name || price.warehouse.slug,
          country: price.warehouse.country?.name || 'Unknown',
          displayedName: price.warehouse.displayedName || price.warehouse.name || price.warehouse.slug,
        });
      }
    });
  });
  
  return {
    items: paginatedItems,
    categories: Array.from(categoryMap.values()),
    brands: Array.from(brandMap.values()),
    warehouses: Array.from(warehouseMap.values()),
    subcategories,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}

/**
 * Fetches just the filter options (brands, warehouses, subcategories) for a category
 * Useful for loading filter options without fetching all items
 */
export async function getCategoryFilterOptions(
  locale: string,
  categorySlug: string
): Promise<{
  brands: BrandInfo[];
  warehouses: WarehouseInfo[];
  subcategories: SubcategoryInfo[];
}> {
  const allItems = await getItemsByLocale(locale);
  const categoryItems = allItems.filter(item => item.category.slug === categorySlug);
  
  // Extract brands
  const brandMap = new Map<string, BrandInfo>();
  categoryItems.forEach(item => {
    if (item.brand?.alias && item.brand?.name) {
      brandMap.set(item.brand.alias, {
        name: item.brand.name,
        slug: item.brand.alias,
      });
    }
  });
  
  // Extract warehouses
  const warehouseMap = new Map<string, WarehouseInfo>();
  categoryItems.forEach(item => {
    item.prices.forEach(price => {
      if (price.warehouse) {
        warehouseMap.set(price.warehouse.slug, {
          id: price.warehouse.slug,
          name: price.warehouse.name || price.warehouse.slug,
          country: price.warehouse.country?.name || 'Unknown',
          displayedName: price.warehouse.displayedName || price.warehouse.name || price.warehouse.slug,
        });
      }
    });
  });
  
  // Extract subcategories
  const currentCategoryData = categoryItems[0]?.category;
  const subcategories = currentCategoryData?.subCategories.map(sub => ({
    id: sub.slug,
    name: sub.name,
    slug: sub.slug,
  })) || [];
  
  return {
    brands: Array.from(brandMap.values()),
    warehouses: Array.from(warehouseMap.values()),
    subcategories,
  };
}
