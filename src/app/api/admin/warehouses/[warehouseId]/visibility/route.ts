import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import { DOMAIN_CONFIGS, type DomainKey } from '@/lib/domain-config';
import { setWarehouseVisibility } from '@/helpers/db/warehouse-visibility';

const ALL_DOMAINS = Object.keys(DOMAIN_CONFIGS) as DomainKey[];

/**
 * Quick single-domain visibility toggle — used by the UA/PL badges in the
 * admin warehouses table, as a lighter alternative to PUT /warehouses/[id]
 * (which requires resending the whole warehouse form).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const { warehouseId } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { domain, visible } = body as { domain?: DomainKey; visible?: boolean };

    if (!domain || !ALL_DOMAINS.includes(domain)) {
      return NextResponse.json(
        { error: `domain must be one of: ${ALL_DOMAINS.join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'visible must be a boolean' }, { status: 400 });
    }

    const [warehouse] = await db
      .select({ id: schema.warehouse.id })
      .from(schema.warehouse)
      .where(eq(schema.warehouse.id, warehouseId))
      .limit(1);

    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    await setWarehouseVisibility(warehouseId, domain, visible);

    return NextResponse.json({ warehouseId, domain, visible });
  } catch (error: any) {
    console.error('Error updating warehouse domain visibility:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
