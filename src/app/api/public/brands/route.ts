import { NextRequest, NextResponse } from 'next/server';
import { getAllBrands } from '@/helpers/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');

    let brands = await getAllBrands();

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      brands = brands.filter((b) =>
        b.name.toLowerCase().includes(q) || b.alias.toLowerCase().includes(q)
      );
    }

    const response = NextResponse.json(brands);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error: any) {
    console.error('[API] Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
