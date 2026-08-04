import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc, or, ilike } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { apiErrorHandler } from '@/lib/error-handler';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);
const LIST_LIMIT = 500;

async function ensureAuthorized(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const [user] = await db
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  if (!user || !user.role || !AUTHORIZED_ROLES.has(user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session, role: user.role };
}

// Lists captured Google Ads landings, optionally filtered by a free-text
// search (matches gclid / GA client_id — the only identifier visible in
// Binotel's dashboard for a call/chat — or campaign/landing page).
export async function GET(request: NextRequest) {
  try {
    const authResult = await ensureAuthorized(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    let query = db.select().from(schema.adClick);
    if (search) {
      query = query.where(
        or(
          ilike(schema.adClick.gaClientId, `%${search}%`),
          ilike(schema.adClick.gclid, `%${search}%`),
          ilike(schema.adClick.utmCampaign, `%${search}%`),
          ilike(schema.adClick.landingPage, `%${search}%`)
        )
      ) as any;
    }

    const adClicks = await query.orderBy(desc(schema.adClick.createdAt)).limit(LIST_LIMIT);

    return NextResponse.json({ adClicks });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/admin/ad-clicks' });
  }
}
