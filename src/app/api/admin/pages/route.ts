import { NextRequest, NextResponse } from "next/server";
import { getAllPagesGrouped, createPage, getPageBySlugAndLocale } from "@/helpers/db/queries";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError, ConflictError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }
    
    logger.info('Fetching all pages (admin)', { userId: session.user.id });

    const pages = await getAllPagesGrouped();
    
    const duration = Date.now() - startTime;
    logger.info('Pages fetched successfully', { 
      userId: session.user.id,
      pagesCount: pages.length,
      duration: `${duration}ms` 
    });

    return NextResponse.json(pages);
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/admin/pages',
    });
  }
}

// POST - Create new page
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || session.user.role !== 'admin') {
      throw new UnauthorizedError('Admin authentication required');
    }

    const body = await request.json();
    const { slug, locale, title, content, isPublished } = body;

    if (!slug || !locale || !title || !content) {
      throw new BadRequestError('Missing required fields: slug, locale, title, content');
    }

    // Validate locale
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale', { locale, validLocales });
    }
    
    logger.info('Creating new page', { slug, locale, userId: session.user.id });

    // Check if page already exists
    const existingPage = await getPageBySlugAndLocale(slug, locale);
    if (existingPage) {
      throw new ConflictError('Page with this slug and locale already exists', { slug, locale });
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
    
    const duration = Date.now() - startTime;
    logger.info('Page created successfully', { 
      slug, 
      locale,
      userId: session.user.id,
      duration: `${duration}ms` 
    });

    return NextResponse.json(
      { message: 'Page created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return apiErrorHandler(error, request, {
      endpoint: 'POST /api/admin/pages',
    });
  }
}
