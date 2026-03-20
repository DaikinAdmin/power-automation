import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { asc } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isUserAdmin } from "@/helpers/db/queries";
import {
  apiErrorHandler,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      throw new UnauthorizedError("Authentication required");
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError("Admin access required");
    }

    const countries = await db
      .select()
      .from(schema.warehouseCountries)
      .orderBy(asc(schema.warehouseCountries.name));

    return NextResponse.json(countries);
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: "GET /api/admin/warehouse-countries",
    });
  }
}
