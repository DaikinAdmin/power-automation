import { NextRequest, NextResponse } from 'next/server';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getVisibleWarehouseIds } from '@/helpers/db/warehouse-visibility';

/**
 * Public, unauthenticated list of warehouse ids visible on the requesting
 * domain. The cart no longer calls this — it syncs with
 * /api/public/cart/stock, which applies the same visibility filter and also
 * returns live stock and prices.
 */
export async function GET(request: NextRequest) {
  try {
    const domainKey = getDomainKeyByHost(request.headers.get('host'));
    const warehouseIds = await getVisibleWarehouseIds(domainKey);

    const response = NextResponse.json({ warehouseIds });
    // Short-lived: visibility can change at any time via the admin panel.
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60');
    response.headers.set('Vary', 'Host');
    return response;
  } catch (error) {
    console.error('Error fetching visible warehouses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
