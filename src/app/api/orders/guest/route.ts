/**
 * POST /api/orders/guest
 *
 * Temporary quick-order endpoint for the UA domain (conversion-rate testing).
 * Automatically creates a user account for first-time visitors and places the
 * order on their behalf. Sends a welcome e-mail with login credentials.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { orderHandler } from '../shared';
import { email } from '@/helpers/email/resend';
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Generates a readable random password (avoids easily confused chars). */
function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

function buildWelcomeEmailHtml(name: string, userEmail: string, password: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1a1a1a;">Вітаємо, ${name}!</h2>
      <p>Ваше замовлення успішно оформлено. Для вас автоматично створено акаунт на <strong>powerautomation.com.ua</strong>.</p>
      <p style="margin-top:16px;"><strong>Дані для входу:</strong></p>
      <table style="border-collapse:collapse;margin-top:8px;">
        <tr><td style="padding:4px 8px;color:#555;">Email:</td><td style="padding:4px 8px;font-weight:bold;">${userEmail}</td></tr>
        <tr><td style="padding:4px 8px;color:#555;">Пароль:</td><td style="padding:4px 8px;font-family:monospace;background:#f4f4f4;border-radius:4px;">${password}</td></tr>
      </table>
      <p style="margin-top:20px;">Рекомендуємо <strong>змінити пароль</strong> після першого входу через
        <a href="https://powerautomation.com.ua/ua/dashboard/settings" style="color:#2563eb;">особистий кабінет</a>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:32px;">Дякуємо за вибір Power Automation!</p>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 5 req / min per IP ─────────────────────────
    const ip = getClientIp(request);
    const rl = checkRateLimit(`guest-order:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await request.json();
    const {
      guestEmail,
      guestName,
      guestPhone,
      guestCountryCode = '+380',
      ...orderPayload
    } = body;

    if (!guestEmail || !guestName) {
      throw new BadRequestError('Guest email and name are required');
    }

    const normalizedEmail = (guestEmail as string).toLowerCase().trim();

    // ── 1. Find or create user ──────────────────────────────
    const [existingUser] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, normalizedEmail))
      .limit(1);

    let userId: string;
    let tempPassword: string | null = null;
    let isNewUser = false;

    if (!existingUser) {
      isNewUser = true;
      tempPassword = generatePassword();
      const hashedPwd = await hashPassword(tempPassword);
      userId = crypto.randomUUID();
      const now = new Date();

      await db.insert(schema.user).values({
        id: userId,
        email: normalizedEmail,
        name: guestName,
        emailVerified: true, // skip email-verification flow
        phoneNumber: guestPhone || '000-000-000',
        countryCode: guestCountryCode,
        userAgreement: true,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(schema.account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPwd,
        createdAt: now,
        updatedAt: now,
      });

      logger.info('Guest user auto-created', { userId, email: normalizedEmail });
    } else {
      userId = existingUser.id;
      logger.info('Guest order for existing user', { userId, email: normalizedEmail });
    }

    // ── 2. Enrich payload with guest customer info ──────────
    const enrichedPayload = {
      ...orderPayload,
      customerInfo: {
        email: normalizedEmail,
        name: guestName,
        phone: guestPhone || '',
        countryCode: guestCountryCode,
        ...(orderPayload.customerInfo || {}),
      },
    };

    // ── 3. Create the order (reuses the same logic as /api/orders) ──
    const orderResponse = await orderHandler(
      enrichedPayload,
      userId,
      orderPayload.locale || 'ua',
      request.headers.get('host'),
    );

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      return NextResponse.json(orderData, { status: orderResponse.status });
    }

    // ── 4. Send welcome e-mail for new accounts (non-blocking) ──
    if (isNewUser && tempPassword) {
      email
        .sendMail({
          from: process.env.MAIL_USER,
          to: normalizedEmail,
          subject: 'Ваш акаунт на Power Automation',
          html: buildWelcomeEmailHtml(guestName, normalizedEmail, tempPassword),
        })
        .catch((err: unknown) =>
          logger.error('Failed to send guest welcome email', {
            email: normalizedEmail,
            error: String(err),
          }),
        );
    }

    return NextResponse.json(orderData);
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'POST /api/orders/guest' });
  }
}
