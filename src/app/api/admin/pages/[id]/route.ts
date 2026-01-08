import { NextRequest, NextResponse } from "next/server";
import { updatePage, deletePage } from "@/helpers/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Get page by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
    }

    const [page] = await db
      .select()
      .from(schema.pageContent)
      .where(eq(schema.pageContent.id, pageId))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Parse content if it's a JSON string
    const pageData = {
      ...page,
      content: typeof page.content === 'string' ? JSON.parse(page.content) : page.content,
    };

    return NextResponse.json(pageData);
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update page by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, isPublished } = body;

    if (!title && !content && isPublished === undefined) {
      return NextResponse.json(
        { error: 'At least one field (title, content, isPublished) must be provided' },
        { status: 400 }
      );
    }

    await updatePage(pageId, {
      ...(title && { title }),
      ...(content && { content }),
      ...(isPublished !== undefined && { isPublished }),
    });

    return NextResponse.json({ message: 'Page updated successfully' });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete page by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pageId = parseInt(id, 10);

    if (isNaN(pageId)) {
      return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
    }

    await deletePage(pageId);

    return NextResponse.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
