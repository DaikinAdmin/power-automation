import { NextResponse } from 'next/server';
import { getAllBrands } from '@/helpers/db/queries';

export async function GET() {
  try {
    const brands = await getAllBrands();
    
    const response = NextResponse.json(brands);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
