import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isUserAdmin } from "@/helpers/db/queries";
import {
  apiErrorHandler,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/error-handler";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const body = await request.json();
    const { vatPercentage } = body;

    if (vatPercentage !== null && vatPercentage !== undefined) {
      const parsed = parseFloat(vatPercentage);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        throw new BadRequestError("vatPercentage must be a number between 0 and 100");
      }
    }

    const [updated] = await db
      .update(schema.warehouseCountries)
      .set({ vatPercentage: vatPercentage !== undefined ? vatPercentage : null })
      .where(eq(schema.warehouseCountries.id, parseInt(id, 10)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: "PATCH /api/admin/warehouse-countries/[id]",
    });
  }
}
