// import prisma from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getCategoriesByLocale } from "@/helpers/db/queries";
import type { CategoryResponse } from "@/helpers/types/api-responses";
import logger from '@/lib/logger';
import { apiErrorHandler, BadRequestError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { locale } = await params;
    
    // Log the request
    logger.info('Fetching categories', { locale });
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      throw new BadRequestError('Invalid locale', { 
        locale, 
        validLocales 
      });
    }

    // Drizzle implementation
    const categories: CategoryResponse[] = await getCategoriesByLocale(locale.toLowerCase());

    const duration = Date.now() - startTime;
    
    // Log successful response
    logger.info('Categories fetched successfully', {
      locale,
      count: categories.length,
      duration: `${duration}ms`,
    });

    // Prisma implementation (commented out)
    // const categories = await db.category.findMany({
    //   orderBy: { name: 'asc' },
    //   include: { subCategories: true, categoryTranslations: {
    //     where: {
    //       locale: locale.toLowerCase()
    //     },
    //     select: {
    //       name: true
    //     }
    //   } }
    // });

    const response = NextResponse.json(categories);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return response;
  } catch (error) {
    // Centralized error handling with automatic logging
    return apiErrorHandler(error, request, {
      endpoint: 'GET /api/public/categories/[locale]',
    });
  }
}
