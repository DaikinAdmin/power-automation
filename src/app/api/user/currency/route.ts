import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

const VALID_CURRENCIES = ['EUR', 'PLN', 'UAH', 'USD'];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({ defaultCurrency: schema.user.defaultCurrency })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

  return NextResponse.json({ currency: user?.defaultCurrency || null });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currency } = await request.json();
  if (!VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  }

  await db
    .update(schema.user)
    .set({ defaultCurrency: currency })
    .where(eq(schema.user.id, session.user.id));

  return NextResponse.json({ success: true });
}
