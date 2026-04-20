// /app/api/auth/[...all]/route.ts
import { authPl, authUa } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

function getAuthForRequest(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  return host.includes("powerautomation.com.ua") ? authUa : authPl;
}

export async function GET(request: Request) {
  return toNextJsHandler(getAuthForRequest(request)).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuthForRequest(request)).POST(request);
}