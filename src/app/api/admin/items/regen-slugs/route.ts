import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { isUserAdmin } from "@/helpers/db/queries";

function generateItemSlug(
  brandSlug: string | null | undefined,
  articleId: string,
): string {
  const base = brandSlug ? `${brandSlug}_${articleId}` : articleId;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Fetch all items
    const items = await db
      .select({
        id: schema.item.id,
        slug: schema.item.slug,
        articleId: schema.item.articleId,
        brandSlug: schema.item.brandSlug,
      })
      .from(schema.item);

    let updated = 0;
    const errors: string[] = [];

    for (const item of items) {
      const newSlug = generateItemSlug(item.brandSlug, item.articleId);

      if (newSlug === item.slug) {
        continue;
      }

      try {
        // Check if another item already has the target slug
        const [conflict] = await db
          .select({ id: schema.item.id })
          .from(schema.item)
          .where(eq(schema.item.slug, newSlug))
          .limit(1);

        if (conflict && conflict.id !== item.id) {
          errors.push(
            `Slug conflict for ${item.articleId}: target slug "${newSlug}" already taken by another item`,
          );
          continue;
        }

        // Update item slug — ON UPDATE CASCADE propagates to itemPrice and itemDetails
        await db
          .update(schema.item)
          .set({ slug: newSlug, updatedAt: now })
          .where(eq(schema.item.id, item.id));

        updated++;
      } catch (err: any) {
        console.error(`Error updating slug for ${item.articleId}:`, {
          message: err?.message,
          stack: err?.stack,
          code: err?.code,
          detail: err?.detail,
        });

        errors.push(
          `Failed to update slug for ${item.articleId}: ${
            err?.message || String(err)
          }`,
        );
      }
    }

    return NextResponse.json({
      total: items.length,
      updated,
      errors,
    });
  } catch (error) {
    console.error("Error regenerating slugs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
