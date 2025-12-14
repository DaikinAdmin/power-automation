// Query helpers for items list endpoint
import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { ItemResponse } from '@/helpers/types/api-responses';

export async function getItemsByLocale(locale: string): Promise<ItemResponse[]> {
  // Get displayed items
  const items = await db
    .select()
    .from(schema.item)
    .where(eq(schema.item.isDisplayed, true))
    .orderBy(desc(schema.item.createdAt));

  if (items.length === 0) return [];

  // Get all article IDs and category slugs
  const articleIds = items.map((i) => i.articleId);
  const categorySlugs = [...new Set(items.map((i) => i.categorySlug).filter(Boolean))];

  // Fetch item details for the locale
  const itemDetails = await db
    .select()
    .from(schema.itemDetails)
    .where(
      and(
        sql`${schema.itemDetails.itemSlug} = ANY(${articleIds})`,
        eq(schema.itemDetails.locale, locale)
      )
    );

  // Fetch all prices for these items
  const itemPrices = await db
    .select()
    .from(schema.itemPrice)
    .where(sql`${schema.itemPrice.itemSlug} = ANY(${articleIds})`);

  // Fetch brands
  const brandSlugs = [...new Set(items.map((i) => i.brandSlug).filter(Boolean))];
  const brands = brandSlugs.length > 0
    ? await db.select().from(schema.brand).where(sql`${schema.brand.alias} = ANY(${brandSlugs})`)
    : [];

  // Fetch warehouses
  const warehouseIds = [...new Set(itemPrices.map((p) => p.warehouseId))];
  const warehouses = warehouseIds.length > 0
    ? await db.select().from(schema.warehouse).where(sql`${schema.warehouse.id} = ANY(${warehouseIds})`)
    : [];

  // Fetch warehouse countries
  const countrySlugs = [...new Set(warehouses.map((w) => w.countrySlug).filter(Boolean))];
  const countries = countrySlugs.length > 0
    ? await db.select().from(schema.warehouseCountries).where(sql`${schema.warehouseCountries.slug} = ANY(${countrySlugs})`)
    : [];

  // Fetch categories (check if categorySlug is category or subcategory)
  const categories = await db
    .select()
    .from(schema.category)
    .where(sql`${schema.category.slug} = ANY(${categorySlugs})`);

  const subcategories = await db
    .select()
    .from(schema.subcategories)
    .where(sql`${schema.subcategories.slug} = ANY(${categorySlugs})`);

  // Get parent categories for subcategories
  const parentCategorySlugs = [...new Set(subcategories.map((s) => s.categorySlug).filter(Boolean))];
  const parentCategories = parentCategorySlugs.length > 0
    ? await db.select().from(schema.category).where(sql`${schema.category.slug} = ANY(${parentCategorySlugs})`)
    : [];

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
            sql`${schema.categoryTranslation.categorySlug} = ANY(${allCategorySlugs})`,
            eq(schema.categoryTranslation.locale, locale)
          )
        )
    : [];

  // Fetch all subcategories for these categories
  const allSubcategories = allCategorySlugs.length > 0
    ? await db
        .select()
        .from(schema.subcategories)
        .where(sql`${schema.subcategories.categorySlug} = ANY(${allCategorySlugs})`)
    : [];

  const allSubcategorySlugs = [...new Set(allSubcategories.map((s) => s.slug))];

  // Fetch subcategory translations
  const subcategoryTranslations = allSubcategorySlugs.length > 0
    ? await db
        .select()
        .from(schema.subcategoryTranslation)
        .where(
          and(
            sql`${schema.subcategoryTranslation.subCategorySlug} = ANY(${allSubcategorySlugs})`,
            eq(schema.subcategoryTranslation.locale, locale)
          )
        )
    : [];

  // Map results
  const mapped = items.map((item) => {
    const detail = itemDetails.find((d) => d.itemSlug === item.articleId);
    const prices = itemPrices.filter((p) => p.itemSlug === item.articleId);
    
    if (!detail || prices.length === 0) {
      return null;
    }

    // Find category - item.categorySlug can be either category or subcategory
    const subcategory = subcategories.find((s) => s.slug === item.categorySlug);
    const categorySlug = subcategory ? subcategory.categorySlug : item.categorySlug;
    const category = [...categories, ...parentCategories].find((c) => c.slug === categorySlug);
    
    if (!category) {
      return null;
    }

    const brand = brands.find((b) => b.alias === item.brandSlug);
    const categoryTranslation = categoryTranslations.find((t) => t.categorySlug === category.slug);
    const categorySubs = allSubcategories.filter((s) => s.categorySlug === category.slug);

    return {
      articleId: item.articleId,
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

  return mapped.filter((item): item is ItemResponse => item !== null);
}
