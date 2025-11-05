import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ items: [], categories: [], subCategories: [] });
  }

  try {
    const searchTerm = query.trim().toLowerCase();
    
    // Search items by articleId and itemName
    const items = await prisma.item.findMany({
      where: {
        OR: [
          {
            articleId: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            itemDetails: {
              some: {
                itemName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            }
          }
        ],
        isDisplayed: true
      },
      include: {
        itemDetails: true,
        category: true,
        subCategory: true,
        brand: true,
        itemPrice: {
          include: {
            warehouse: true
          }
        }
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
