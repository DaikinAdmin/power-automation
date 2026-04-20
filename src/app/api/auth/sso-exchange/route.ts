/**
 * SSO exchange endpoint — receives a raw session token (from sso-callback),
 * signs it with BETTER_AUTH_SECRET to create a valid better-auth session cookie,
 * and sets that cookie on the current domain before redirecting to the final page.
 *
 * This allows a session established on the primary domain (.pl) after Google OAuth
 * to be "transferred" to a secondary domain (.com.ua) as a proper signed cookie,
 * so server-side session checks (dashboard, profile) work correctly there too.
 *
 * Cookie format mirrors better-call's signCookieValue():
 *   encodeURIComponent(`${rawToken}.${btoa(HMAC-SHA256(rawToken, secret))}`)
 *
 * Query params:
 *   token — raw session token
 *   final — destination path on the current domain (e.g. "/ua/checkout")
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DOMAIN_CONFIGS } from "@/lib/domain-config";

/**
 * Replicates better-call's signCookieValue() so we produce a value that
 * better-auth's getSignedCookie() will accept.
 */
async function buildSignedCookieValue(rawToken: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawToken),
  );
  // btoa gives standard base64 WITH padding, matching better-call's makeSignature
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return encodeURIComponent(`${rawToken}.${signature}`);
}

const ALLOWED_HOSTS = new Set(Object.values(DOMAIN_CONFIGS).map((c) => c.host));

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const final = request.nextUrl.searchParams.get("final") || "/";

  const requestHost =
    request.headers.get("x-forwarded-host") || request.nextUrl.hostname;

  // Safety: only exchange on allowed domains
  if (!ALLOWED_HOSTS.has(requestHost)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!token) {
    return NextResponse.redirect(new URL(final, request.url));
  }

  // Verify the token references a real, non-expired session
  const [sessionRecord] = await db
    .select({ expiresAt: sessionTable.expiresAt })
    .from(sessionTable)
    .where(eq(sessionTable.token, token))
    .limit(1);

  if (!sessionRecord || new Date(sessionRecord.expiresAt) < new Date()) {
    return NextResponse.redirect(new URL(final, request.url));
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    console.error("[sso-exchange] BETTER_AUTH_SECRET is not set");
    return NextResponse.redirect(new URL(final, request.url));
  }

  const cookieValue = await buildSignedCookieValue(token, secret);
  const isProduction = process.env.NODE_ENV === "production";
  // Cookie name mirrors better-auth's useSecureCookies logic in auth.ts
  const cookieName = isProduction
    ? "__Secure-better-auth.session_token"
    : "better-auth.session_token";
  const maxAge = 60 * 60 * 24; // 1 day — matches auth.ts session.expiresIn

  const response = NextResponse.redirect(new URL(final, request.url));

  // Set the header directly to avoid Next.js's response.cookies helper
  // applying a second encodeURIComponent on an already-encoded value.
  response.headers.append(
    "Set-Cookie",
    `${cookieName}=${cookieValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProduction ? "; Secure" : ""}`,
  );

  return response;
}
