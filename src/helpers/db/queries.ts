// Drizzle query helpers for API endpoints
import { db } from '@/db';
import { eq, and, like, or, desc, asc, sql, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type {
  ItemResponse,
  ItemListResponse,
  CategoryResponse,
  BrandResponse,
  WarehouseResponse,
  OrderResponse,
  UserResponse,
  DiscountLevelResponse,
} from '@/helpers/types/api-responses';

// ==================== Category Queries ====================
export async function getCategoriesByLocale(locale: string) {
  const categories = await db
    .select({
      id: schema.category.id,
      slug: schema.category.slug,
      name: schema.category.name,
      imageLink: schema.category.imageLink,
      isVisible: schema.category.isVisible,
      createdAt: schema.category.createdAt,
      updatedAt: schema.category.updatedAt,
    })
    .from(schema.category)
    .where(eq(schema.category.isVisible, true));

  // Fetch translations
  const categoryTranslations = await db
    .select()
    .from(schema.categoryTranslation)
    .where(eq(schema.categoryTranslation.locale, locale));

  // Fetch subcategories
  const subcategories = await db
    .select()
    .from(schema.subcategories)
    .where(eq(schema.subcategories.isVisible, true));

  // Fetch subcategory translations
  const subcategoryTranslations = await db
    .select()
    .from(schema.subcategoryTranslation)
    .where(eq(schema.subcategoryTranslation.locale, locale));

  // Map data
  return categories.map((cat) => {
    const translation = categoryTranslations.find((t) => t.categorySlug === cat.slug);
    const subs = subcategories.filter((s) => s.categorySlug === cat.slug);

    return {
      slug: cat.slug,
      name: translation?.name || cat.name,
      imageLink: cat.imageLink || '',
      isVisible: cat.isVisible ?? true,
      createdAt: cat.createdAt || '',
      updatedAt: cat.updatedAt || '',
      subCategories: subs.map((sub) => {
        const subTranslation = subcategoryTranslations.find((t) => t.subCategorySlug === sub.slug);
        return {
          slug: sub.slug,
          name: subTranslation?.name || sub.name,
          categorySlug: cat.slug,
          isVisible: sub.isVisible ?? true,
          createdAt: sub.createdAt || '',
          updatedAt: sub.updatedAt || '',
        };
      }),
    };
  });
}

export async function getCategoryBySlug(slug: string, locale: string) {
  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.slug, slug))
    .limit(1);

  if (!category) return null;

  const [translation] = await db
    .select()
    .from(schema.categoryTranslation)
    .where(
      and(
        eq(schema.categoryTranslation.categorySlug, slug),
        eq(schema.categoryTranslation.locale, locale)
      )
    )
    .limit(1);

  const subcategories = await db
    .select()
    .from(schema.subcategories)
    .where(eq(schema.subcategories.categorySlug, category.slug));

  const subcategoryTranslations = await db
    .select()
    .from(schema.subcategoryTranslation)
    .where(eq(schema.subcategoryTranslation.locale, locale));

  return {
    slug: category.slug,
    name: translation?.name || category.name,
    imageLink: category.imageLink,
    isVisible: category.isVisible ?? true,
    createdAt: category.createdAt || '',
    updatedAt: category.updatedAt || '',
    subCategories: subcategories.map((sub) => {
      const subTranslation = subcategoryTranslations.find((t) => t.subCategorySlug === sub.slug);
      return {
        slug: sub.slug,
        name: subTranslation?.name || sub.name,
        categorySlug: category.slug,
        isVisible: sub.isVisible ?? true,
        createdAt: sub.createdAt || '',
        updatedAt: sub.updatedAt || '',
      };
    }),
  };
}

// ==================== Brand Queries ====================
export async function getAllBrands() {
  const brands = await db
    .select()
    .from(schema.brand)
    .where(eq(schema.brand.isVisible, true))
    .orderBy(asc(schema.brand.name));

  return brands.map((brand) => ({
    alias: brand.alias,
    name: brand.name,
    imageLink: brand.imageLink,
    isVisible: brand.isVisible,
    createdAt: brand.createdAt || '',
    updatedAt: brand.updatedAt || '',
  }));
}

export async function getBrandByAlias(alias: string) {
  const [brand] = await db
    .select()
    .from(schema.brand)
    .where(eq(schema.brand.alias, alias))
    .limit(1);

  if (!brand) return null;

  return {
    alias: brand.alias,
    name: brand.name,
    imageLink: brand.imageLink,
    isVisible: brand.isVisible,
    createdAt: brand.createdAt || '',
    updatedAt: brand.updatedAt || '',
  };
}

// ==================== Warehouse Queries ====================
export async function getAllWarehouses() {
  const warehouses = await db
    .select()
    .from(schema.warehouse)
    .where(eq(schema.warehouse.isVisible, true));

  const countries = await db
    .select()
    .from(schema.warehouseCountries);

  return warehouses.map((wh) => {
    const country = countries.find((c) => c.slug === wh.countrySlug);
    return {
      slug: wh.id, // Using id as slug for now
      name: wh.name,
      displayedName: wh.displayedName,
      countrySlug: wh.countrySlug,
      isVisible: wh.isVisible ?? true,
      createdAt: wh.createdAt || '',
      updatedAt: wh.updatedAt || '',
      country: country
        ? {
            slug: country.slug,
            name: country.name,
            countryCode: country.countryCode,
            phoneCode: country.phoneCode,
            isActive: country.isActive,
          }
        : null,
    };
  });
}

// ==================== Item Queries ====================
export async function getItemBySlug(slug: string, locale: string): Promise<ItemResponse | null> {
  const [item] = await db
    .select()
    .from(schema.item)
    .where(
      and(
        eq(schema.item.slug, slug),
        eq(schema.item.isDisplayed, true)
      )
    )
    .limit(1);

  if (!item) return null;

  // Get item details for locale
  const itemDetails = await db
    .select()
    .from(schema.itemDetails)
    .where(eq(schema.itemDetails.itemSlug, slug));

  const detailForLocale = itemDetails.find((d) => d.locale === locale);
  const fallbackDetail = itemDetails.find((d) => d.locale === 'en') || itemDetails[0];
  const detail = detailForLocale || fallbackDetail;

  if (!detail) return null;

  // Get prices
  const prices = await db
    .select()
    .from(schema.itemPrice)
    .where(eq(schema.itemPrice.itemSlug, slug));

  // Get warehouses
  const warehouseIds = prices.map((p) => p.warehouseId);
  const warehouses = warehouseIds.length > 0
    ? await db
        .select()
        .from(schema.warehouse)
        .where(inArray(schema.warehouse.id, warehouseIds))
    : [];

  // Get countries
  const countries = await db
    .select()
    .from(schema.warehouseCountries);

  // Get brand
  let brand = null;
  if (item.brandSlug) {
    [brand] = await db
      .select()
      .from(schema.brand)
      .where(eq(schema.brand.alias, item.brandSlug))
      .limit(1);
  }

  // Get category - item.categorySlug can reference either a category.slug or subcategory.slug
  // First check if it's a subcategory
  const [subcategory] = await db
    .select()
    .from(schema.subcategories)
    .where(eq(schema.subcategories.slug, item.categorySlug))
    .limit(1);

  // If it's a subcategory, get the parent category, otherwise check if it's a category
  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.slug, subcategory?.categorySlug || item.categorySlug))
    .limit(1);

  const [categoryTranslation] = await db
    .select()
    .from(schema.categoryTranslation)
    .where(
      and(
        eq(schema.categoryTranslation.categorySlug, category?.slug || ''),
        eq(schema.categoryTranslation.locale, locale)
      )
    )
    .limit(1);

  const subcategories = category
    ? await db
        .select()
        .from(schema.subcategories)
        .where(eq(schema.subcategories.categorySlug, category.slug))
    : [];

  const subcategoryTranslations = await db
    .select()
    .from(schema.subcategoryTranslation)
    .where(eq(schema.subcategoryTranslation.locale, locale));

  return {
    slug: item.slug,
    articleId: item.articleId,
    isDisplayed: item.isDisplayed,
    sellCounter: item.sellCounter,
    itemImageLink: item.itemImageLink || [],
    categorySlug: category?.slug || '',
    subCategorySlug: subcategory?.slug || '',
    brandSlug: item.brandSlug,
    warrantyType: item.warrantyType,
    warrantyLength: item.warrantyLength,
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    details: {
      locale: detail.locale,
      itemName: detail.itemName,
      description: detail.description,
      specifications: detail.specifications,
      seller: detail.seller,
      discount: detail.discount,
      popularity: detail.popularity,
      metaKeyWords: detail.metaKeyWords,
      metaDescription: detail.metaDescription,
    },
    prices: prices.map((price) => {
      const warehouse = warehouses.find((w) => w.id === price.warehouseId);
      const country = countries.find((c) => c.slug === warehouse?.countrySlug);
      return {
        warehouseSlug: price.warehouseId,
        price: price.price,
        quantity: price.quantity,
        promotionPrice: price.promotionPrice,
        promoCode: price.promoCode,
        promoEndDate: price.promoEndDate || null,
        badge: price.badge || null,
        warehouse: {
          slug: warehouse?.id || '',
          name: warehouse?.name || null,
          displayedName: warehouse?.displayedName || '',
          countrySlug: warehouse?.countrySlug || null,
          isVisible: warehouse?.isVisible ?? true,
          createdAt: warehouse?.createdAt || '',
          updatedAt: warehouse?.updatedAt || '',
          country: country
            ? {
                slug: country.slug,
                name: country.name,
                countryCode: country.countryCode,
                phoneCode: country.phoneCode,
                isActive: country.isActive,
              }
            : null,
        },
      };
    }),
    brand: brand
      ? {
          alias: brand.alias,
          name: brand.name,
          imageLink: brand.imageLink,
          isVisible: brand.isVisible,
          createdAt: brand.createdAt || '',
          updatedAt: brand.updatedAt || '',
        }
      : null,
    category: {
      slug: category?.slug || '',
      name: categoryTranslation?.name || category?.name || '',
      imageLink: category?.imageLink || '',
      isVisible: category?.isVisible ?? true,
      createdAt: category?.createdAt || '',
      updatedAt: category?.updatedAt || '',
      subCategories: subcategories.map((sub) => {
        const subTranslation = subcategoryTranslations.find((t) => t.subCategorySlug === sub.slug);
        return {
          slug: sub.slug,
          name: subTranslation?.name || sub.name,
          categorySlug: category.slug,
          isVisible: sub.isVisible ?? true,
          createdAt: sub.createdAt || '',
          updatedAt: sub.updatedAt || '',
        };
      }),
    },
  };
}

// ==================== Page Content Queries ====================

// ---Get All Pages Grouped by Slug ---
export async function getAllPagesGrouped() {
  const rows = await db
    .select()
    .from(schema.pageContent)
    .orderBy(schema.pageContent.slug, schema.pageContent.locale);

  // Group by slug
  const grouped: Record<string, typeof rows> = {};
  rows.forEach((row) => {
    if (!grouped[row.slug]) grouped[row.slug] = [];
    grouped[row.slug].push(row);
  });

  return grouped;
}

// ---Get Page by Slug and Locale ---
export async function getPageBySlugAndLocale(slug: string, locale: string) {
  const pages = await db
    .select()
    .from(schema.pageContent)
    .where(
      and(eq(schema.pageContent.slug, slug), eq(schema.pageContent.locale, locale))
    );
  return pages[0] || null;
}

// ---Create New Page ---
export async function createPage(data: {
  slug: string;
  locale: string;
  title: string;
  content: any;
  isPublished?: boolean;
}) {
  return await db.insert(schema.pageContent).values({
    ...data,
    content: JSON.stringify(data.content),
  });
}

// ---Update Existing Page ---
export async function updatePage(
  id: number,
  data: { title?: string; content?: any; isPublished?: boolean }
) {
  const updateData: any = { ...data };
  if (data.content) updateData.content = JSON.stringify(data.content);

  return await db
    .update(schema.pageContent)
    .set(updateData)
    .where(eq(schema.pageContent.id, id));
}

// ---delete Page ---
export async function deletePage(id: number) {
  return await db.delete(schema.pageContent).where(eq(schema.pageContent.id, id));
}

// ==================== User Queries ====================
export async function getUserRole(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return user?.role || null;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

// ==================== Banners Queries ====================

// Get all banners
export async function getAllBanners() {
  return await db
    .select()
    .from(schema.banners)
    .orderBy(asc(schema.banners.sortOrder), desc(schema.banners.updatedAt));
}

// Get banners by filters (position, device, locale, isActive)
export async function getBanners(filters?: {
  position?: string;
  device?: string;
  locale?: string;
  isActive?: boolean;
}) {
  const conditions = [];
  
  if (filters?.position) {
    conditions.push(eq(schema.banners.position, filters.position));
  }
  if (filters?.device) {
    conditions.push(eq(schema.banners.device, filters.device));
  }
  if (filters?.locale) {
    conditions.push(eq(schema.banners.locale, filters.locale));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(schema.banners.isActive, filters.isActive));
  }

  const query = db
    .select()
    .from(schema.banners)
    .orderBy(asc(schema.banners.sortOrder), desc(schema.banners.updatedAt));

  if (conditions.length > 0) {
    return await query.where(and(...conditions));
  }

  return await query;
}

// Get banner by ID
export async function getBannerById(id: number) {
  const [banner] = await db
    .select()
    .from(schema.banners)
    .where(eq(schema.banners.id, id))
    .limit(1);
  
  return banner || null;
}

// Create new banner
export async function createBanner(data: {
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  position: string;
  device?: string;
  locale: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const [banner] = await db
    .insert(schema.banners)
    .values({
      title: data.title || null,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl || null,
      position: data.position,
      device: data.device || 'desktop',
      locale: data.locale,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  
  return banner;
}

// Update banner
export async function updateBanner(
  id: number,
  data: {
    title?: string;
    imageUrl?: string;
    linkUrl?: string;
    position?: string;
    device?: string;
    locale?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const [banner] = await db
    .update(schema.banners)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.banners.id, id))
    .returning();
  
  return banner;
}

// Delete banner
export async function deleteBanner(id: number) {
  const [deletedBanner] = await db
    .delete(schema.banners)
    .where(eq(schema.banners.id, id))
    .returning();
  
  return deletedBanner;
}

// Get active banners for specific position, device, and locale
export async function getActiveBanners(
  position: string,
  device: string,
  locale: string
) {
  return await db
    .select()
    .from(schema.banners)
    .where(
      and(
        eq(schema.banners.position, position),
        eq(schema.banners.device, device),
        eq(schema.banners.locale, locale),
        eq(schema.banners.isActive, true)
      )
    )
    .orderBy(asc(schema.banners.sortOrder));
}