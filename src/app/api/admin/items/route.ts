import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';
import { Badge, Prisma } from '@prisma/client';
import { Item } from '@/helpers/types/item';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get locale from query parameters, default to 'pl'
    // const { searchParams } = new URL(request.url);
    // const locale = searchParams.get('locale') || 'pl';

    const items = await prisma.item.findMany({
      // where: {
      //   ItemDetails: {
      //     some: {
      //       locale: locale
      //     }
      //   }
      // },
      select: {
        id: true,
        articleId: true,
        isDisplayed: true,
        sellCounter: true,
        itemImageLink: true,
        brandId: true,
        brandName: true,
        warrantyType: true,
        warrantyLength: true,
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
            slug: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            alias: true,
            imageLink: true,
            isVisible: true,
          },
        },
        itemDetails: {
          // where: {
          //   locale: locale
          // },
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
                country: true
              }
            }
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    const response = NextResponse.json(items);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as Item;
    const {
      articleId,
      isDisplayed,
      itemImageLink,
      itemPrice,
      itemDetails,
      categoryId,
      subCategoryId,
      brandId,
      brandName,
      warrantyType,
      warrantyLength,
    } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    // Create item with related data
    const itemData: Prisma.ItemCreateInput = {
      articleId,
      isDisplayed,
      itemImageLink,
      category: {
        connect: { id: categoryId },
      },
      subCategory: {
        connect: { id: subCategoryId },
      },
      brandName: brandName || undefined,
      warrantyType: warrantyType || undefined,
      warrantyLength: typeof warrantyLength === 'number' ? warrantyLength : undefined,
      itemPrice: {
        create: itemPrice
          .filter((price: { warehouseId: string; }) => price.warehouseId)
          .map((price: { warehouseId: string; price: number; quantity: number; promotionPrice: number | null; promoEndDate: string | number | Date | null; promoCode: any; badge: any; }) => ({
            warehouseId: price.warehouseId!,
            price: price.price,
            quantity: price.quantity,
            promotionPrice: price.promotionPrice ?? null,
            promoEndDate: price.promoEndDate ? new Date(price.promoEndDate) : null,
            promoCode: price.promoCode || null,
            badge: price.badge || Badge.ABSENT,
          })),
      },
      itemDetails: {
        create: itemDetails.map((detail: { locale: any; itemName: any; description: any; specifications: any; seller: any; discount: any; popularity: any; }) => ({
          locale: detail.locale,
          itemName: detail.itemName,
          description: detail.description,
          specifications: detail.specifications,
          seller: detail.seller || null,
          discount: detail.discount ?? null,
          popularity: detail.popularity ?? null,
        })),
      },
    };

    if (brandId) {
      itemData.brand = { connect: { id: brandId } };
    }

    const item = await prisma.item.create({
      data: itemData,
      include: {
        itemDetails: true,
        itemPrice: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const createdPrices = await prisma.itemPrice.findMany({
      where: { itemId: item.id },
    });

    if (createdPrices.length > 0) {
      await prisma.itemPriceHistory.createMany({
        data: createdPrices.map((price: any) => ({
          itemId: price.itemId,
          warehouseId: price.warehouseId,
          price: price.price,
          quantity: price.quantity,
          promotionPrice: price.promotionPrice,
          promoEndDate: price.promoEndDate,
          promoCode: price.promoCode,
          badge: price.badge || Badge.ABSENT,
        })),
      });
    }


    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
