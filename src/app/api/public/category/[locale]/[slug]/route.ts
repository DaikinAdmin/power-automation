import { NextRequest, NextResponse } from 'next/server';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  try {
    const { locale, slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    console.log('[API] Fetching items for category:', slug, 'locale:', locale);

    // Get filter parameters from URL
    const subcategoryFilters = searchParams.getAll('subcategory');
    const brandFilters = searchParams.getAll('brand');
    const warehouseFilters = searchParams.getAll('warehouse');

    console.log('[API] Filters - subcategories:', subcategoryFilters, 'brands:', brandFilters, 'warehouses:', warehouseFilters);

    // Fetch all items for locale
    const allItems: ItemResponse[] = await getItemsByLocale(locale);
    
    // Filter by category slug
    let filteredItems = allItems.filter((item) => item.category.slug === slug);

    // Apply subcategory filter
    if (subcategoryFilters.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        item.subCategorySlug && subcategoryFilters.includes(item.subCategorySlug)
      );
    }

    // Apply brand filter
    if (brandFilters.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        item.brand?.name && brandFilters.includes(item.brand.name)
      );
    }

    // Apply warehouse filter
    if (warehouseFilters.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        item.prices.some((price) => warehouseFilters.includes(price.warehouse.slug))
      );
    }

    console.log('[API] Filtered items count:', filteredItems.length);

    const response = NextResponse.json(filteredItems);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('[API] Error fetching category items:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
