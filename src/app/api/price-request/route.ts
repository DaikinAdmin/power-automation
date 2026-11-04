/**
 * POST /api/price-request
 *
 * «Запитати ціну» з картки товару. Нічого не зберігає і не прив'язує до
 * акаунта — лише надсилає лист менеджерам (MANAGER_EMAILS) з контактами
 * відвідувача; Reply-To = email відвідувача.
 */
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getServerDomainConfig } from '@/lib/server-domain';
import { sendPriceRequestManagerEmail } from '@/lib/order-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`price-request:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const itemId = str(body.itemId, 100);
    const warehouseId = str(body.warehouseId, 100);
    const quantity = Math.min(Math.max(Math.floor(Number(body.quantity) || 1), 1), 1_000_000);
    const name = str(body.name, 200);
    const customerEmail = str(body.email, 200).toLowerCase();
    const phone = str(body.phone, 40);
    const countryCode = str(body.countryCode, 6);
    const comment = str(body.comment, 2000);
    const locale = str(body.locale, 5);

    if (!itemId || !name || !EMAIL_RE.test(customerEmail)) {
      throw new BadRequestError('Missing required fields: itemId, name, email');
    }

    const [item] = await db
      .select({ slug: schema.item.slug, articleId: schema.item.articleId })
      .from(schema.item)
      .where(eq(schema.item.id, itemId))
      .limit(1);

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const [detail] = await db
      .select({ itemName: schema.itemDetails.itemName })
      .from(schema.itemDetails)
      .where(
        and(
          eq(schema.itemDetails.itemSlug, item.slug),
          eq(schema.itemDetails.locale, locale || 'pl'),
        ),
      )
      .limit(1);

    const [warehouse] = warehouseId
      ? await db
          .select({ displayedName: schema.warehouse.displayedName })
          .from(schema.warehouse)
          .where(eq(schema.warehouse.id, warehouseId))
          .limit(1)
      : [];

    const domain = await getServerDomainConfig();

    await sendPriceRequestManagerEmail({
      customerName: name,
      customerEmail,
      customerPhone: phone ? `${countryCode} ${phone}`.trim() : undefined,
      productName: detail?.itemName || item.articleId,
      articleId: item.articleId,
      productUrl: `${domain.baseUrl}/${locale || 'pl'}/product/${item.slug}`,
      warehouseName: warehouse?.displayedName ?? null,
      quantity,
      comment: comment || null,
      locale,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/price-request' });
  }
}
