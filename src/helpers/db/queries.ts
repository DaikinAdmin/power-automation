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
      imageLink: cat.imageLink,
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
export async function getItemByArticleId(articleId: string, locale: string): Promise<ItemResponse | null> {
  const [item] = await db
    .select()
    .from(schema.item)
    .where(
      and(
        eq(schema.item.articleId, articleId),
        eq(schema.item.isDisplayed, true)
      )
    )
    .limit(1);

  if (!item) return null;

  // Get item details for locale
  const itemDetails = await db
    .select()
    .from(schema.itemDetails)
    .where(eq(schema.itemDetails.itemSlug, articleId));

  const detailForLocale = itemDetails.find((d) => d.locale === locale);
  const fallbackDetail = itemDetails.find((d) => d.locale === 'en') || itemDetails[0];
  const detail = detailForLocale || fallbackDetail;

  if (!detail) return null;

  // Get prices
  const prices = await db
    .select()
    .from(schema.itemPrice)
    .where(eq(schema.itemPrice.itemSlug, articleId));

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
      imageLink: category?.imageLink || null,
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
