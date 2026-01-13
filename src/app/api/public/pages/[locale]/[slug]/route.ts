import { NextRequest, NextResponse } from "next/server";
import { getPageBySlugAndLocale } from "@/helpers/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  try {
    const { locale, slug } = await params;
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const page = await getPageBySlugAndLocale(slug, locale.toLowerCase());

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Parse content if it's a JSON string
    let parsedContent;
    try {
      parsedContent = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
      console.log('Public API - Content structure for', slug, ':', Object.keys(parsedContent));
      
      // Ensure the content has the correct EditorJS structure
      if (!parsedContent.blocks && !Array.isArray(parsedContent.blocks)) {
        console.error('Invalid content structure - missing blocks array:', parsedContent);
      }
    } catch (error) {
      console.error('Error parsing page content:', error);
      parsedContent = page.content;
    }

    const pageData = {
      ...page,
      content: parsedContent,
    };

    const response = NextResponse.json(pageData);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
