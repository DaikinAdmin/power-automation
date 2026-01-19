import { NextRequest, NextResponse } from 'next/server';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const startTime = Date.now();
  try {
    const { locale, slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'es', 'ua'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale');
    }

    // Get filter parameters from URL
    const subcategoryFilters = searchParams.getAll('subcategory');
    const brandFilters = searchParams.getAll('brand');
    const warehouseFilters = searchParams.getAll('warehouse');

    logger.info('Fetching items for category', {
      endpoint: 'GET /api/public/category/[locale]/[slug]',
      locale,
      slug,
      subcategoryFilters: subcategoryFilters.length > 0 ? subcategoryFilters : undefined,
      brandFilters: brandFilters.length > 0 ? brandFilters : undefined,
      warehouseFilters: warehouseFilters.length > 0 ? warehouseFilters : undefined,
    });

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
        item.brand?.alias && brandFilters.includes(item.brand.alias)
      );
    }

    // Apply warehouse filter
    if (warehouseFilters.length > 0) {
      filteredItems = filteredItems.filter((item) =>
        item.prices.some((price) => warehouseFilters.includes(price.warehouse.slug))
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Category items fetched successfully', {
      endpoint: 'GET /api/public/category/[locale]/[slug]',
      locale,
      slug,
      totalItems: allItems.length,
      filteredCount: filteredItems.length,
      hasFilters: subcategoryFilters.length > 0 || brandFilters.length > 0 || warehouseFilters.length > 0,
      duration,
    });

    const response = NextResponse.json(filteredItems);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/public/category/[locale]/[slug]' });
  }
}