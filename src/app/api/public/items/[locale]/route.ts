import { NextRequest, NextResponse } from 'next/server';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Extract filter parameters
    const searchQuery = searchParams.get('search');
    const brands = searchParams.getAll('brand');
    const warehouses = searchParams.getAll('warehouse');

    console.log('[API] Fetching items for locale:', locale);
    console.log('[API] Search query:', searchQuery);
    console.log('[API] Brand filters:', brands);
    console.log('[API] Warehouse filters:', warehouses);

    // Drizzle implementation - returns complete item data
    let items: ItemResponse[] = await getItemsByLocale(locale);
    console.log('[API] Retrieved items:', items.length);

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
        const itemBrand = item.brand?.name;
        return itemBrand && brands.includes(itemBrand);
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

    console.log('[API] Filtered items:', items.length);

    const response = NextResponse.json(items);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('[API] Error fetching public items:', error);
    console.error('[API] Error name:', error?.name);
    console.error('[API] Error code:', error?.code);
    console.error('[API] Error detail:', error?.detail);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: error?.code,
      detail: error?.detail
    }, { status: 500 });
  }
}
