// /app/api/auth/[...all]/route.ts
import { authPl, authUa } from "@/lib/auth";
import { DOMAIN_CONFIGS } from "@/lib/domain-config";
import { toNextJsHandler } from "better-auth/next-js";

const handlerPl = toNextJsHandler(authPl);
const handlerUa = toNextJsHandler(authUa);

function getHandler(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  if (host.includes(DOMAIN_CONFIGS.ua.host)) return handlerUa;
  if (host.includes(DOMAIN_CONFIGS.pl.host)) return handlerPl;
  // fallback: localhost / unknown → PL instance
  return handlerPl;
}

export async function GET(request: Request) {
  return getHandler(request).GET(request);
}

export async function POST(request: Request) {
  return getHandler(request).POST(request);
}