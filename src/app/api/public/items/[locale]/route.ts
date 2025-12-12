import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { getItemsByLocale } from '@/helpers/db/items-queries';
import type { ItemListResponse } from '@/helpers/types/api-responses';

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

    // Drizzle implementation
    const items: ItemListResponse[] = await getItemsByLocale(locale);

    const response = NextResponse.json(items);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
    */
  } catch (error) {
    console.error('Error fetching public items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
