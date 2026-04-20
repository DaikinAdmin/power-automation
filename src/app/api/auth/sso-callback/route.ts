/**
 * SSO callback endpoint — runs on the primary domain (.pl) right after Google OAuth.
 *
 * Flow:
 *  1. OAuth completes on .pl and better-auth redirects here (callbackURL set by client).
 *  2. We read the raw session token from the active session cookie.
 *  3. We redirect the browser to the origin domain's sso-exchange endpoint, carrying
 *     the raw token so it can create a proper session cookie there.
 *
 * The `dest` query param is the final destination on the origin domain
 * (full absolute URL, e.g. https://powerautomation.com.ua/ua/checkout).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DOMAIN_CONFIGS } from "@/lib/domain-config";

const ALLOWED_HOSTS = new Set(Object.values(DOMAIN_CONFIGS).map((c) => c.host));

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  // No active session — OAuth didn't complete; send to .pl home
  if (!session?.session?.token) {
    return NextResponse.redirect(new URL("/", DOMAIN_CONFIGS.pl.baseUrl));
  }

  const dest = request.nextUrl.searchParams.get("dest");

  // No cross-domain destination — just land on .pl with the session
  if (!dest) {
    return NextResponse.redirect(new URL("/", DOMAIN_CONFIGS.pl.baseUrl));
  }

  let destUrl: URL;
  try {
    destUrl = new URL(dest);
  } catch {
    return NextResponse.redirect(new URL("/", DOMAIN_CONFIGS.pl.baseUrl));
  }

  // Only allow redirects to known domains
  if (!ALLOWED_HOSTS.has(destUrl.hostname)) {
    return NextResponse.redirect(new URL("/", DOMAIN_CONFIGS.pl.baseUrl));
  }

  // If the destination is already on .pl, no token bridge is needed
  if (destUrl.hostname === new URL(DOMAIN_CONFIGS.pl.baseUrl).hostname) {
    return NextResponse.redirect(destUrl.toString());
  }

  // Build the exchange URL on the destination domain
  const exchangeUrl = new URL("/api/auth/sso-exchange", destUrl.origin);
  exchangeUrl.searchParams.set("token", session.session.token);
  // Pass only the path+search portion so the exchange endpoint stays on the same origin
  exchangeUrl.searchParams.set("final", destUrl.pathname + destUrl.search + destUrl.hash);

  return NextResponse.redirect(exchangeUrl.toString());
}
