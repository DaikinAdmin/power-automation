import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getItemBySlug } from "@/helpers/db/queries";
import logger from "@/lib/logger";
import {
  apiErrorHandler,
  BadRequestError,
} from "@/lib/error-handler";

// Related items are precomputed offline (see scripts/generate-linked-items.ts)
// and stored in the linked_items table. This endpoint just resolves the
// stored slugs into full catalog data for the product page carousel.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  try {
    const { locale, slug } = await params;

    const validLocales = ["pl", "en", "ua", "es"];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError("Invalid locale");
    }

    const [linked] = await db
      .select()
      .from(schema.linkedItems)
      .where(eq(schema.linkedItems.itemSlug, slug))
      .limit(1);

    const linkedSlugs = (linked?.linkedItemSlug || []).filter(Boolean);

    if (linkedSlugs.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const resolvedItems = await Promise.all(
      linkedSlugs.map((linkedSlug) =>
        getItemBySlug(linkedSlug, locale.toLowerCase()),
      ),
    );

    const items = resolvedItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    return NextResponse.json({ items });
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: "GET /api/public/items/[locale]/[slug]/related",
    });
  }
}
