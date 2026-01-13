import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pages = await db.select().from(schema.pageContent);
    const results = [];

    for (const page of pages) {
      try {
        let content;
        if (typeof page.content === 'string') {
          content = JSON.parse(page.content);
        } else {
          content = page.content;
        }

        const pageInfo: any = {
          id: page.id,
          slug: page.slug,
          locale: page.locale,
          contentKeys: Object.keys(content),
          valid: false,
          action: 'none',
        };

        let needsUpdate = false;
        let fixedContent = content;

        // Check if content has wrong structure
        if (!content.blocks || !Array.isArray(content.blocks)) {
          pageInfo.valid = false;
          
          // Check if it's double-wrapped
          if (content.content && content.content.blocks) {
            pageInfo.action = 'unwrap';
            fixedContent = content.content;
            needsUpdate = true;
          } else if (content.time && content.version) {
            pageInfo.action = 'add-empty-blocks';
            fixedContent = { ...content, blocks: [] };
            needsUpdate = true;
          } else {
            pageInfo.action = 'reset-to-empty';
            fixedContent = { blocks: [], time: Date.now(), version: '2.28.0' };
            needsUpdate = true;
          }
        } else {
          pageInfo.valid = true;
          pageInfo.blockCount = content.blocks.length;
        }

        if (needsUpdate) {
          await db
            .update(schema.pageContent)
            .set({ content: JSON.stringify(fixedContent) })
            .where(eq(schema.pageContent.id, page.id));
          
          pageInfo.updated = true;
        }

        results.push(pageInfo);
      } catch (error) {
        results.push({
          id: page.id,
          slug: page.slug,
          locale: page.locale,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ 
      message: 'Content check complete',
      totalPages: pages.length,
      results 
    });
  } catch (error) {
    console.error('Error fixing page content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
