import { NextRequest, NextResponse } from "next/server";
import { getAllPagesGrouped, createPage, getPageBySlugAndLocale } from "@/helpers/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pages = await getAllPagesGrouped();

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new page
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, locale, title, content, isPublished } = body;

    if (!slug || !locale || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, locale, title, content' },
        { status: 400 }
      );
    }

    // Validate locale
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Check if page already exists
    const existingPage = await getPageBySlugAndLocale(slug, locale);
    if (existingPage) {
      return NextResponse.json(
        { error: 'Page with this slug and locale already exists' },
        { status: 409 }
      );
    }

    await createPage({
      slug,
      locale,
      title,
      content,
      isPublished: isPublished ?? true,
    });

    // Revalidate the new page
    revalidatePath(`/${locale}/${slug}`);
    console.log(`Revalidated cache for new page /${locale}/${slug}`);

    return NextResponse.json(
      { message: 'Page created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
