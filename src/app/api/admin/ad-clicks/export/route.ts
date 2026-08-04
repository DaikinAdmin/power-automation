import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { eq, desc, or, ilike } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { apiErrorHandler } from '@/lib/error-handler';

const AUTHORIZED_ROLES = new Set(['admin', 'employee']);

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

function csvField(value: string | null): string {
  const str = value ?? '';
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

    const rows = await query.orderBy(desc(schema.adClick.createdAt));

    const header = [
      'Created At',
      'GA Client ID',
      'Google Click ID',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'UTM Term',
      'UTM Content',
      'Landing Page',
      'Referrer',
      'Domain',
    ].join(',');

    const lines = rows.map((row) =>
      [
        csvField(row.createdAt),
        csvField(row.gaClientId),
        csvField(row.gclid),
        csvField(row.utmSource),
        csvField(row.utmMedium),
        csvField(row.utmCampaign),
        csvField(row.utmTerm),
        csvField(row.utmContent),
        csvField(row.landingPage),
        csvField(row.referrer),
        csvField(row.domain),
      ].join(',')
    );

    const csv = [header, ...lines].join('\r\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ad-clicks-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/admin/ad-clicks/export' });
  }
}
