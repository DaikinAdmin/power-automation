// import prisma from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { getCategoriesByLocale } from "@/helpers/db/queries";
import type { CategoryResponse } from "@/helpers/types/api-responses";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;
    
    // Validate locale parameter
    const validLocales = ['pl', 'en', 'ua', 'es'];
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Drizzle implementation
    const categories: CategoryResponse[] = await getCategoriesByLocale(locale.toLowerCase());

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
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
