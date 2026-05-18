import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { item } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export interface ItemDimensionsResponse {
  articleId: string;
  grossWeight: number | null;
  heightPacking: number | null;
  widthPacking: number | null;
  lengthPacking: number | null;
}

/**
 * GET /api/items/dimensions?articleIds=id1,id2,...
 *
 * Returns packing dimensions and gross weight for the given articleIds.
 * Used at checkout to determine parcel-locker eligibility.
 */
export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('articleIds');
  if (!param?.trim()) {
    return NextResponse.json([] as ItemDimensionsResponse[]);
  }

  const articleIds = param.split(',').map((s) => s.trim()).filter(Boolean);
  if (articleIds.length === 0) {
    return NextResponse.json([] as ItemDimensionsResponse[]);
  }

  const rows = await db
    .select({
      articleId: item.articleId,
      grossWeight: item.grossWeight,
      heightPacking: item.heightPacking,
      widthPacking: item.widthPacking,
      lengthPacking: item.lengthPacking,
    })
    .from(item)
    .where(inArray(item.articleId, articleIds));

  return NextResponse.json(rows as ItemDimensionsResponse[]);
}
