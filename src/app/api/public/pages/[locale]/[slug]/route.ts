import { NextRequest, NextResponse } from "next/server";
import { getPageBySlugAndLocale } from "@/helpers/db/queries";
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError, NotFoundError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const startTime = Date.now();
  try {
    const { locale, slug } = await params;
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale');
    }

    logger.info('Fetching page', {
      endpoint: 'GET /api/public/pages/[locale]/[slug]',
      locale,
      slug,
    });

    const page = await getPageBySlugAndLocale(slug, locale.toLowerCase());

    if (!page) {
      throw new NotFoundError('Page not found');
    }

    // Parse content if it's a JSON string
    let parsedContent;
    try {
      parsedContent = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
      logger.info('Page content parsed', {
        endpoint: 'GET /api/public/pages/[locale]/[slug]',
        slug,
        contentStructure: Object.keys(parsedContent),
      });
      
      // Ensure the content has the correct EditorJS structure
      if (!parsedContent.blocks && !Array.isArray(parsedContent.blocks)) {
        logger.error('Invalid content structure', {
          endpoint: 'GET /api/public/pages/[locale]/[slug]',
          slug,
          content: parsedContent,
        });
      }
    } catch (error) {
      logger.error('Error parsing page content', {
        endpoint: 'GET /api/public/pages/[locale]/[slug]',
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      parsedContent = page.content;
    }

    const pageData = {
      ...page,
      content: parsedContent,
    };

    const duration = Date.now() - startTime;
    logger.info('Page fetched successfully', {
      endpoint: 'GET /api/public/pages/[locale]/[slug]',
      locale,
      slug,
      duration,
    });

    const response = NextResponse.json(pageData);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    return apiErrorHandler(error, request, { endpoint: 'GET /api/public/pages/[locale]/[slug]' });
  }
}
