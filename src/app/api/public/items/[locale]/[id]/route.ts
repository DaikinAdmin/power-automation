import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; id: string }> }
) {
  try {
    const { locale, id } = await params;
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'de', 'fr', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Find the item by ID
    const item = await prisma.item.findUnique({
      where: {
        id: id,
        isDisplayed: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
            categoryId: true
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
                country: true,
                displayedName: true
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
            country: recommendedPrice.warehouse.country,
            displayedName: recommendedPrice.warehouse.displayedName,
          },
          price: recommendedPrice.price,
          promotionPrice: recommendedPrice.promotionPrice,
          quantity: recommendedPrice.quantity,
          badge: recommendedPrice.badge || null,
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
      image: item.itemImageLink,
      isDisplayed: item.isDisplayed,
      sellCounter: item.sellCounter,
      categoryId: item.categoryId,
      subCategoryId: item.subCategoryId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      
      // Format warehouses for display
      warehouses: item.itemPrice.map((price: any) => ({
        warehouseId: price.warehouse.id,
        warehouseName: price.warehouse.name || '',
        warehouseCountry: price.warehouse.country || '',
        displayedName: price.warehouse.displayedName,
        price: `${price.price} €`,
        specialPrice: price.promotionPrice ? `${price.promotionPrice} €` : null,
        originalPrice: `${price.price} €`,
        inStock: price.quantity > 0,
        quantity: price.quantity,
        badge: price.badge || null,
      })),
      
      // Get the first available details or empty object
      name: resolvedDetail?.itemName || 'Unnamed Product',
      brand: item.brand?.name || item.brandName || '',
      brandId: item.brand?.id || null,
      brandAlias: item.brand?.alias || null,
      brandImage: item.brand?.imageLink || null,
      description: resolvedDetail?.description || '',
      badge: formattedRecommended?.badge || null,
      warrantyMonths: item.warrantyLength || 0,
      warrantyType: item.warrantyType || null,
      
      // Category information
      category: item.category.name,
      categorySlug: item.category.slug,
      subcategory: item.subCategory.name,
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
