import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { getItemByArticleId } from '@/helpers/db/queries';
import type { ItemResponse } from '@/helpers/types/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  try {
    const { locale, slug } = await params;

    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Drizzle implementation
    const itemData: ItemResponse | null = await getItemByArticleId(slug, locale.toLowerCase());

    if (!itemData) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get the first recommended warehouse that has stock
    const recommendedPrice = itemData.prices.find((p) => p.quantity > 0) || itemData.prices[0];

    const formattedRecommended = recommendedPrice
      ? {
          warehouse: {
            slug: recommendedPrice.warehouseSlug,
            name: recommendedPrice.warehouse.name,
            country: recommendedPrice.warehouse.country?.name || '',
            displayedName: recommendedPrice.warehouse.displayedName,
          },
          price: recommendedPrice.price,
          promotionPrice: recommendedPrice.promotionPrice,
          quantity: recommendedPrice.quantity,
          badge: recommendedPrice.badge || null,
        }
      : undefined;

    // Format item data for the frontend
    const formattedItem = {
      id: itemData.articleId, // Keep for backwards compatibility
      articleId: itemData.articleId,
      itemImageLink: itemData.itemImageLink,
      isDisplayed: itemData.isDisplayed,
      sellCounter: itemData.sellCounter,
      createdAt: itemData.createdAt,
      updatedAt: itemData.updatedAt,

      // Format warehouses for display
      prices: itemData.prices.map((price) => ({
        warehouseSlug: price.warehouseSlug,
        warehouseName: price.warehouse.name || '',
        warehouseCountry: price.warehouse.country?.name || '',
        displayedName: price.warehouse.displayedName,
        price: `${price.price} €`,
        specialPrice: price.promotionPrice ? `${price.promotionPrice} €` : null,
        originalPrice: `${price.price} €`,
        inStock: price.quantity > 0,
        quantity: price.quantity,
        badge: price.badge || null,
        promoEndDate: price.promoEndDate,
        promoCode: price.promoCode || null,
      })),

      // Product details
      name: itemData.details.itemName,
      brandName: itemData.brand?.name || null,
      brandImage: itemData.brand?.imageLink || null,
      brandSlug: itemData.brandSlug,
      description: itemData.details.description || '',
      specifications: itemData.details.specifications || '',
      seller: itemData.details.seller || '',
      discount: itemData.details.discount || 0,
      popularity: itemData.details.popularity || 0,
      badge: formattedRecommended?.badge || null,
      warrantyMonths: itemData.warrantyLength || 0,
      warrantyType: itemData.warrantyType || null,

      // Category information
      categoryName: itemData.category.name,
      categorySlug: itemData.category.slug,
      subcategory: itemData.category.subCategories,

      // Include the recommended warehouse
      recommendedWarehouse: formattedRecommended,
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* Prisma implementation (commented out)
export async function GET_PRISMA(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  try {
    const { locale, slug } = await params;

    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Find the item by ID
    const item = await db.item.findUnique({
      where: {
        articleId: slug,
        isDisplayed: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          },
          include: {
            subCategories:{
              select: {
                id: true,
                name: true,
                slug: true,
                
              },
              include: {
                subCategoryTranslations: {
                  where: {
                    locale: locale.toLowerCase()
                  },
                  select: {
                    name: true
                  }
                }
              }
            },
            categoryTranslations: {
              where: {
                locale: locale.toLowerCase()
              },
              select: {
                name: true
              }
            }
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            alias: true,
            imageLink: true,
            isVisible: true,
          }
        },
        itemDetails: {
          where: {
            locale: locale.toLowerCase()
          },
          select: {
            id: true,
            locale: true,
            itemName: true,
            description: true,
            specifications: true,
            seller: true,
            discount: true,
            popularity: true,
          }
        },
        itemPrice: {
          select: {
            id: true,
            price: true,
            quantity: true,
            promotionPrice: true,
            promoEndDate: true,
            promoCode: true,
            badge: true,
            warehouse: {
              select: {
                id: true,
                name: true,
                displayedName: true
              },
              include: {
                country: true
              }
            }
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get the first recommended warehouse that has stock
    const recommendedPrice = item.itemPrice.find((p: { quantity: number }) => p.quantity > 0) || item.itemPrice[0];

    const formattedRecommended = recommendedPrice
      ? {
        warehouse: {
          id: recommendedPrice.warehouse.id,
          name: recommendedPrice.warehouse.name,
          country: recommendedPrice.warehouse.country?.name || '',
          displayedName: recommendedPrice.warehouse.displayedName,
        },
        price: recommendedPrice.price,
        promotionPrice: recommendedPrice.promotionPrice,
        quantity: recommendedPrice.quantity,
        badge: recommendedPrice.badge || null
      }
      : undefined;

    const normalizedLocale = locale.toLowerCase();
    const normalizedDetails = item.itemDetails.map((detail: any) => ({
      ...detail,
      locale: detail.locale ? detail.locale.toLowerCase() : '',
    }));

    const detailForLocale = normalizedDetails.find((detail: any) => detail.locale === normalizedLocale);
    const fallbackDetail = normalizedDetails.find((detail: any) => detail.locale === 'en') || normalizedDetails[0];
    const resolvedDetail = detailForLocale || fallbackDetail;

    // Format item data for the frontend
    const formattedItem = {
      id: item.id,
      articleId: item.articleId,
      itemImageLink: item.itemImageLink,
      isDisplayed: item.isDisplayed,
      sellCounter: item.sellCounter,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,

      // Format warehouses for display
      prices: item.itemPrice.map((price: any) => ({
        warehouseId: price.warehouse.id,
        warehouseName: price.warehouse.name || '',
        warehouseCountry: price.warehouse.country.name || '',
        displayedName: price.warehouse.displayedName,
        price: `${price.price} €`,
        specialPrice: price.promotionPrice ? `${price.promotionPrice} €` : null,
        originalPrice: `${price.price} €`,
        inStock: price.quantity > 0,
        quantity: price.quantity,
        badge: price.badge || null,
        promoEndDate: price.promoEndDate,
        promoCode: price.promoCode || null,
      })),

      // Get the first available details or empty object
      name: resolvedDetail?.itemName || 'Unnamed Product',
      brandName: item.brand?.name || null,
      brandImage: item.brand?.imageLink || null,
      description: resolvedDetail?.description || '',
      specifications: resolvedDetail?.specifications || '',
      seller: resolvedDetail?.seller || '',
      discount: resolvedDetail?.discount || 0,
      popularity: resolvedDetail?.popularity || 0,
      badge: formattedRecommended?.badge || null,
      warrantyMonths: item.warrantyLength || 0,
      warrantyType: item.warrantyType || null,

      // Category information
      categoryName: item.category.categoryTranslations[0]?.name || item.category.name,
      categorySlug: item.category.slug,
      subcategory: item.category.subCategories,
      itemDetails: normalizedDetails,

      // Include the recommended warehouse
      recommendedWarehouse: formattedRecommended,
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
*/
