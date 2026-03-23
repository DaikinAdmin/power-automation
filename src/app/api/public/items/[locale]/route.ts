import { NextRequest, NextResponse } from 'next/server';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { locale } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale', { locale, validLocales });
    }

    // Extract filter parameters
    const searchQuery = searchParams.get('search');
    const brands = searchParams.getAll('brand');
    const warehouses = searchParams.getAll('warehouse');

    logger.info('Fetching public items', { 
      locale, 
      searchQuery, 
      brands, 
      warehouses 
    });

    // Drizzle implementation - returns complete item data
    let items: ItemResponse[] = await getItemsByLocale(locale);

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        const itemName = item.details?.itemName?.toLowerCase() || '';
        const articleId = item.articleId?.toLowerCase() || '';
        const brandName = item.brand?.name?.toLowerCase() || '';
        const categoryName = item.category?.name?.toLowerCase() || '';
        
        return itemName.includes(query) || 
               articleId.includes(query) || 
               brandName.includes(query) ||
               categoryName.includes(query);
      });
    }

    // Apply brand filter
    if (brands.length > 0) {
      items = items.filter(item => {
        const itemBrandAlias = item.brand?.alias;
        return itemBrandAlias && brands.includes(itemBrandAlias);
      });
    }

    // Apply warehouse filter
    if (warehouses.length > 0) {
      items = items.filter(item => {
        return item.prices.some(price => 
          price.warehouse && warehouses.includes(price.warehouse.slug)
        );
      });
    }

    // Strip margin and bake it into prices before returning public response
    const publicItems = items.map(item => ({
      ...item,
      prices: item.prices.map(({ margin, price, promotionPrice, ...rest }) => {
        const marginRate = 1 + ((margin ?? 20) / 100);
        return {
          ...rest,
          price: price,
          promotionPrice: promotionPrice != null ? promotionPrice * marginRate : null,
        };
      }),
    }));

    const duration = Date.now() - startTime;
    logger.info('Public items fetched successfully', { 
      locale, 
      totalItems: publicItems.length,
      duration: duration
    });

    const response = NextResponse.json(publicItems);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/public/items/[locale]',
    });
  }
}
