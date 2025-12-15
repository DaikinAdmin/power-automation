import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemResponse } from '@/helpers/types/api-responses';

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

    console.log('[API] Fetching items for locale:', locale);
    // Drizzle implementation - returns complete item data with all prices, warehouse info, and category/subcategory data
    const items: ItemResponse[] = await getItemsByLocale(locale);
    console.log('[API] Retrieved items:', items.length);

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
