import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const items = await prisma.item.findMany({
      where: {
        isDisplayed: true,
        itemDetails: {
          some: {
            locale: locale
          }
        }
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
          where: {
            locale: locale
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
                country: true,
                displayedName: true
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
    console.error('Error fetching public items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
