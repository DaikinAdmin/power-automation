// Query helpers for items list endpoint
import { db } from '@/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { ItemResponse } from '@/helpers/types/api-responses';

export async function getItemsByLocale(locale: string): Promise<ItemResponse[]> {
  try {
    console.log('[getItemsByLocale] Starting query for locale:', locale);
    // Get displayed items
    const items = await db
      .select()
      .from(schema.item)
      .where(eq(schema.item.isDisplayed, true))
      .orderBy(desc(schema.item.createdAt));

    console.log('[getItemsByLocale] Found items:', items.length);
    if (items.length === 0) return [];

  // Get all slugs and category slugs
  const itemSlugs = items.map((i) => i.slug);
  const categorySlugs = [...new Set(items.map((i) => i.categorySlug).filter(Boolean))];

  // Fetch item details for the locale
  const itemDetails = await db
    .select()
    .from(schema.itemDetails)
    .where(
      and(
        inArray(schema.itemDetails.itemSlug, itemSlugs),
        eq(schema.itemDetails.locale, locale)
      )
    );

  // Fetch all prices for these items
  const itemPrices = await db
    .select()
    .from(schema.itemPrice)
    .where(inArray(schema.itemPrice.itemSlug, itemSlugs));

  console.log('[getItemsByLocale PRICES]', {
    totalItems: items.length,
    totalItemSlugs: itemSlugs.length,
    pricesFetched: itemPrices.length,
    firstFewItemSlugs: itemSlugs.slice(0, 5),
  });

  // Fetch brands
  const brandSlugs = [...new Set(items.map((i) => i.brandSlug).filter(Boolean))] as string[];
  const brands = brandSlugs.length > 0
    ? await db.select().from(schema.brand).where(inArray(schema.brand.alias, brandSlugs))
    : [];

  // Fetch warehouses
  const warehouseIds = [...new Set(itemPrices.map((p) => p.warehouseId))];
  const warehouses = warehouseIds.length > 0
    ? await db.select().from(schema.warehouse).where(inArray(schema.warehouse.id, warehouseIds))
    : [];

  // Fetch warehouse countries
  const countrySlugs = [...new Set(warehouses.map((w) => w.countrySlug).filter(Boolean))] as string[];
  const countries = countrySlugs.length > 0
    ? await db.select().from(schema.warehouseCountries).where(inArray(schema.warehouseCountries.slug, countrySlugs))
    : [];

  // Fetch categories (check if categorySlug is category or subcategory)
  const categories = categorySlugs.length > 0
    ? await db
        .select()
        .from(schema.category)
        .where(inArray(schema.category.slug, categorySlugs as string[]))
    : [];

  const subcategories = categorySlugs.length > 0
    ? await db
        .select()
        .from(schema.subcategories)
        .where(inArray(schema.subcategories.slug, categorySlugs as string[]))
    : [];

  // Get parent categories for subcategories
  const parentCategorySlugs = [...new Set(subcategories.map((s) => s.categorySlug).filter(Boolean))] as string[];
  const parentCategories = parentCategorySlugs.length > 0
    ? await db.select().from(schema.category).where(inArray(schema.category.slug, parentCategorySlugs))
    : [];

  console.log('[getItemsByLocale DEBUG]', {
    categorySlugsCount: categorySlugs.length,
    categorySlugsPreview: categorySlugs.slice(0, 5),
    categoriesFetched: categories.length,
    categoriesPreview: categories.slice(0, 3).map(c => c.slug),
    subcategoriesFetched: subcategories.length,
    parentCategoriesFetched: parentCategories.length,
  });

  // Combine all unique category slugs for translations
  const allCategorySlugs = [...new Set([
    ...categories.map((c) => c.slug),
    ...parentCategories.map((c) => c.slug),
  ])];

  // Fetch category translations
  const categoryTranslations = allCategorySlugs.length > 0
    ? await db
        .select()
        .from(schema.categoryTranslation)
        .where(
          and(
            inArray(schema.categoryTranslation.categorySlug, allCategorySlugs),
            eq(schema.categoryTranslation.locale, locale)
          )
        )
    : [];

  // Fetch all subcategories for these categories
  const allSubcategories = allCategorySlugs.length > 0
    ? await db
        .select()
        .from(schema.subcategories)
        .where(inArray(schema.subcategories.categorySlug, allCategorySlugs))
    : [];

  const allSubcategorySlugs = [...new Set(allSubcategories.map((s) => s.slug))];

  // Fetch subcategory translations
  const subcategoryTranslations = allSubcategorySlugs.length > 0
    ? await db
        .select()
        .from(schema.subcategoryTranslation)
        .where(
          and(
            inArray(schema.subcategoryTranslation.subCategorySlug, allSubcategorySlugs),
            eq(schema.subcategoryTranslation.locale, locale)
          )
        )
    : [];

  // Map results
  let noCategoryCount = 0;
  let noDetailOrPriceCount = 0;
  const mapped = items.map((item, index) => {
    const detail = itemDetails.find((d) => d.itemSlug === item.slug);
    const prices = itemPrices.filter((p) => p.itemSlug === item.slug);
    
    if (!detail || prices.length === 0) {
      noDetailOrPriceCount++;
      return null;
    }

    // Find category - item.categorySlug can be either category or subcategory
    const subcategory = subcategories.find((s) => s.slug === item.categorySlug);
    const categorySlug = subcategory ? subcategory.categorySlug : item.categorySlug;
    const category = [...categories, ...parentCategories].find((c) => c.slug === categorySlug);
    
    if (!category) {
      noCategoryCount++;
      if (index < 3) {
        console.log('[getItemsByLocale MAPPING DEBUG] Item without category:', {
          articleId: item.articleId,
          itemCategorySlug: item.categorySlug,
          subcategoryFound: !!subcategory,
          finalCategorySlug: categorySlug,
          categoryFound: !!category,
        });
      }
      return null;
    }

    const brand = brands.find((b) => b.alias === item.brandSlug);
    const categoryTranslation = categoryTranslations.find((t) => t.categorySlug === category.slug);
    const categorySubs = allSubcategories.filter((s) => s.categorySlug === category.slug);

    return {
      articleId: item.articleId,
      slug: item.slug,
      isDisplayed: item.isDisplayed,
      sellCounter: item.sellCounter,
      itemImageLink: item.itemImageLink || [],
      categorySlug: category.slug,
      subCategorySlug: subcategory?.slug || null,
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
        slug: category.slug,
        name: categoryTranslation?.name || category.name,
        isVisible: category.isVisible ?? true,
        createdAt: category.createdAt || '',
        updatedAt: category.updatedAt || '',
        subCategories: categorySubs.map((sub) => {
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
    } as ItemResponse;
  });

  console.log('[getItemsByLocale FILTERING]', {
    totalItemsFetched: items.length,
    mappedItemsCount: mapped.length,
    noCategoryCount,
    noDetailOrPriceCount,
    finalItemsAfterFilter: mapped.filter(item => item !== null).length,
  });

  return mapped.filter((item): item is ItemResponse => item !== null);
  } catch (error) {
    console.error('Error in getItemsByLocale:', error);
    throw error;
  }
}
