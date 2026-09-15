import { NextRequest, NextResponse } from 'next/server';
import { getDomainKeyByHost } from '@/lib/domain-config';
import { getVisibleWarehouseIds } from '@/helpers/db/warehouse-visibility';

/**
 * Public, unauthenticated list of warehouse ids visible on the requesting
 * domain. Used client-side to sanitize a cart restored from localStorage —
 * a warehouse an admin hid after the item was added must not silently stay
 * orderable in the UI (the server rejects it anyway at checkout, see
 * /api/orders — this just lets the cart catch it earlier).
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
