import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHash } from 'crypto';
// import prisma from '@/db';
import { db } from '@/db';
import { Item } from '@/helpers/types/item';
import { eq, desc, or, ilike, and, sql, count } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';
import logger from '@/lib/logger';
import { apiErrorHandler, UnauthorizedError, ForbiddenError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '5');
    const searchTerm = searchParams.get('search') || '';
    const brandFilter = searchParams.get('brand') || '';
    const categoryFilter = searchParams.get('category') || '';
    const hideHidden = searchParams.get('hideHidden') === 'true';
    
    logger.info('Fetching items (admin)', { 
      userId: session.user.id, 
      page, 
      pageSize,
      searchTerm,
      brandFilter,
      categoryFilter,
      hideHidden
    });

    // Build WHERE conditions for filtering
    const conditions = [];
    
    if (brandFilter) {
      conditions.push(eq(schema.item.brandSlug, brandFilter));
    }
    
    if (categoryFilter) {
      conditions.push(eq(schema.item.categorySlug, categoryFilter));
    }
    
    if (hideHidden) {
      conditions.push(eq(schema.item.isDisplayed, true));
    }
    
    if (searchTerm) {
      const searchLower = `%${searchTerm.toLowerCase()}%`;
      const searchConditions = [
        ilike(schema.item.articleId, searchLower),
        ilike(schema.item.brandSlug, searchLower)
      ];
      
      // Only add alias search if we're sure the field is searchable
      searchConditions.push(
        sql`LOWER(COALESCE(${schema.item.alias}, '')) LIKE ${searchLower}`
      );
      
      conditions.push(or(...searchConditions));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count for stats and pagination (all items)
    const [totalCountResult] = await db
      .select({ count: count() })
      .from(schema.item);
    const totalCount = totalCountResult?.count || 0;
    
    // Get filtered count
    const [filteredCountResult] = await db
      .select({ count: count() })
      .from(schema.item)
      .where(whereClause);
    const filteredCount = filteredCountResult?.count || 0;
    
    // Get stats for displayed/hidden items in filtered set
    const [displayedCountResult] = await db
      .select({ count: count() })
      .from(schema.item)
      .where(whereClause ? and(whereClause, eq(schema.item.isDisplayed, true)) : eq(schema.item.isDisplayed, true));
    const displayedCount = displayedCountResult?.count || 0;
    
    // Get unique brands and categories for filter dropdowns (from all items)
    const uniqueBrandsResult = await db
      .selectDistinct({ brandSlug: schema.item.brandSlug })
      .from(schema.item)
      .where(sql`${schema.item.brandSlug} IS NOT NULL`);
    const uniqueBrands = uniqueBrandsResult
      .map(r => r.brandSlug)
      .filter((b): b is string => b !== null)
      .sort();
    
    const uniqueCategoriesResult = await db
      .selectDistinct({ categorySlug: schema.item.categorySlug })
      .from(schema.item)
      .where(sql`${schema.item.categorySlug} IS NOT NULL`);
    const uniqueCategories = uniqueCategoriesResult
      .map(r => r.categorySlug)
      .filter((c): c is string => c !== null)
      .sort();

    // Fetch paginated items with filters
    const offset = (page - 1) * pageSize;
    const paginatedItems = await db
      .select()
      .from(schema.item)
      .where(whereClause)
      .orderBy(desc(schema.item.id))
      .limit(pageSize)
      .offset(offset);

    // Fetch related data for paginated items only
    const itemsWithRelations = await Promise.all(
      paginatedItems.map(async (item) => {
        let category = null;
        let subCategory = null;

        // Check if categorySlug is a category or subcategory
        if (item.categorySlug) {
          // First, try to find in categories
          const [foundCategory] = await db
            .select()
            .from(schema.category)
            .where(eq(schema.category.slug, item.categorySlug))
            .limit(1);

          if (foundCategory) {
            // It's a category
            category = foundCategory;
          } else {
            // Try to find in subcategories
            const [foundSubCategory] = await db
              .select()
              .from(schema.subcategories)
              .where(eq(schema.subcategories.slug, item.categorySlug))
              .limit(1);

            if (foundSubCategory) {
              subCategory = foundSubCategory;
              // Get parent category
              const [parentCategory] = await db
                .select()
                .from(schema.category)
                .where(eq(schema.category.slug, foundSubCategory.categorySlug))
                .limit(1);
              category = parentCategory || null;
            }
          }
        }

        // Fetch other related data
        const [brand, itemDetails, itemPrices] = await Promise.all([
          item.brandSlug
            ? db.select().from(schema.brand).where(eq(schema.brand.alias, item.brandSlug)).limit(1).then(r => r[0])
            : null,
          db.select().from(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, item.slug)),
          db.select({
            id: schema.itemPrice.id,
            itemSlug: schema.itemPrice.itemSlug,
            warehouseId: schema.itemPrice.warehouseId,
            price: schema.itemPrice.price,
            quantity: schema.itemPrice.quantity,
            promotionPrice: schema.itemPrice.promotionPrice,
            promoStartDate: schema.itemPrice.promoStartDate,
            promoEndDate: schema.itemPrice.promoEndDate,
            promoCode: schema.itemPrice.promoCode,
            badge: schema.itemPrice.badge,
            createdAt: schema.itemPrice.createdAt,
            updatedAt: schema.itemPrice.updatedAt,
            warehouse: schema.warehouse,
          })
            .from(schema.itemPrice)
            .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
            .where(eq(schema.itemPrice.itemSlug, item.slug)),
        ]);

        return {
          id: item.id,
          articleId: item.articleId,
          slug: item.slug,
          alias: item.alias,
          categorySlug: item.categorySlug,
          isDisplayed: item.isDisplayed,
          sellCounter: item.sellCounter,
          itemImageLink: item.itemImageLink,
          brandSlug: item.brandSlug,
          warrantyType: item.warrantyType,
          warrantyLength: item.warrantyLength,
          linkedItems: item.linkedItems,
          category,
          subCategory,
          brand,
          itemDetails,
          itemPrice: itemPrices,
        };
      })
    );

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const items = await db.item.findMany({
      select: {
        id: true,
        articleId: true,
        isDisplayed: true,
        sellCounter: true,
        itemImageLink: true,
        brandSlug: true,
        warrantyType: true,
        warrantyLength: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            alias: true,
            imageLink: true,
            isVisible: true,
          },
        },
        itemDetails: {
          select: {
            id: true,
            locale: true,
            itemName: true,
            description: true,
            specifications: true,
            seller: true,
            discount: true,
            popularity: true,
          }
        },
        itemPrice: {
          select: {
            id: true,
            price: true,
            quantity: true,
            promotionPrice: true,
            promoEndDate: true,
            promoCode: true,
            badge: true,
            warehouse: {
              select: {
                id: true,
                name: true,
                country: true
              }
            }
          }
        },
        linkedItems: true,
      },
      orderBy: {
        id: 'desc'
      }
    });
    */

    // Calculate stats
    const stats = {
      total: totalCount,
      selected: filteredCount,
      displayed: displayedCount,
      hidden: filteredCount - displayedCount,
    };
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredCount / pageSize);

    // Calculate ETag based on current data + query parameters
    const dataString = JSON.stringify({
      items: itemsWithRelations,
      page,
      pageSize,
      searchTerm,
      brandFilter,
      categoryFilter,
      totalCount,
      filteredCount
    });
    const etag = createHash('md5').update(dataString).digest('hex');
    
    // Check if client has cached version
    const clientEtag = request.headers.get('if-none-match');
    if (clientEtag === etag) {
      // Data hasn't changed, return 304 Not Modified
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'private, max-age=0, must-revalidate',
        }
      });
    }

    const responseData = {
      items: itemsWithRelations,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: filteredCount,
      },
      stats,
      filters: {
        brands: uniqueBrands,
        categories: uniqueCategories,
      },
    };

    const response = NextResponse.json(responseData);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    
    const duration = Date.now() - startTime;
    logger.info('Items fetched successfully', { 
      userId: session.user.id,
      itemCount: itemsWithRelations.length,
      totalPages,
      duration 
    });
    
    return response;
  } catch (error) {
    console.error('Error fetching items:', error);
    logger.error('Error fetching items', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as Item;
    const {
      articleId,
      alias,
      slug,
      isDisplayed,
      itemImageLink,
      itemPrice,
      itemDetails,
      categorySlug,
      brandSlug,
      warrantyType,
      warrantyLength,
    } = body;

    if (!slug || !articleId) {
      return NextResponse.json({ error: 'Slug and Article ID are required' }, { status: 400 });
    }

    // Drizzle implementation with new category/subcategory logic
    const itemId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Determine if categorySlug is a category or subcategory
    let finalCategorySlug = categorySlug;
    if (categorySlug) {
      // Check if it's a category
      const [category] = await db
        .select()
        .from(schema.category)
        .where(eq(schema.category.slug, categorySlug))
        .limit(1);

      if (!category) {
        // Check if it's a subcategory
        const [subCategory] = await db
          .select()
          .from(schema.subcategories)
          .where(eq(schema.subcategories.slug, categorySlug))
          .limit(1);

        if (subCategory) {
          // Use subcategory slug as categorySlug
          finalCategorySlug = subCategory.slug;
        }
      }
    }

    // Create the item
    const [newItem] = await db
      .insert(schema.item)
      .values({
        articleId: articleId,
        slug: slug, // Add the required slug field,
        alias: alias || '',
        isDisplayed: isDisplayed ?? false,
        itemImageLink: itemImageLink || null,
        categorySlug: finalCategorySlug || "",
        brandSlug: brandSlug || "",
        warrantyType: warrantyType || "",
        warrantyLength: warrantyLength || 0,
        sellCounter: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Create item prices
    if (itemPrice && itemPrice.length > 0) {
      const priceRecords = itemPrice
        .filter((price: any) => price.warehouseId)
        .map((price: any) => ({
          id: crypto.randomUUID(),
          itemId: newItem.id,
          itemSlug: newItem.slug,
          warehouseId: price.warehouseId,
          price: price.price,
          quantity: price.quantity,
          promotionPrice: price.promotionPrice ?? null,
          promoEndDate: price.promoEndDate ? new Date(price.promoEndDate).toISOString() : null,
          promoCode: price.promoCode || null,
          badge: price.badge || "ABSENT",
          createdAt: now,
          updatedAt: now,
        }));

      await db.insert(schema.itemPrice).values(priceRecords);

      // Create price history entries
      const historyRecords = priceRecords.map((price: any) => ({
        id: crypto.randomUUID(),
        itemId: price.itemId,
        warehouseId: price.warehouseId,
        price: price.price,
        quantity: price.quantity,
        promotionPrice: price.promotionPrice,
        promoEndDate: price.promoEndDate,
        promoCode: price.promoCode,
        badge: price.badge,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(schema.itemPriceHistory).values(historyRecords);
    }

    // Create item details
    if (itemDetails && itemDetails.length > 0) {
      const detailRecords = itemDetails.map((detail: any) => ({
        id: crypto.randomUUID(),
        itemSlug: newItem.slug,
        locale: detail.locale,
        itemName: detail.itemName,
        description: detail.description,
        specifications: detail.specifications,
        seller: detail.seller || null,
        discount: detail.discount ?? null,
        popularity: detail.popularity ?? null,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(schema.itemDetails).values(detailRecords);
    }

    // Fetch the created item with relations
    const [createdItem] = await db
      .select()
      .from(schema.item)
      .where(eq(schema.item.id, newItem.id))
      .limit(1);

    const createdItemDetails = await db
      .select()
      .from(schema.itemDetails)
      .where(eq(schema.itemDetails.itemSlug, createdItem.slug));

    const createdItemPrices = await db
      .select({
        id: schema.itemPrice.id,
        itemSlug: schema.itemPrice.itemSlug,
        warehouseId: schema.itemPrice.warehouseId,
        price: schema.itemPrice.price,
        quantity: schema.itemPrice.quantity,
        promotionPrice: schema.itemPrice.promotionPrice,
        promoEndDate: schema.itemPrice.promoEndDate,
        promoCode: schema.itemPrice.promoCode,
        badge: schema.itemPrice.badge,
        createdAt: schema.itemPrice.createdAt,
        updatedAt: schema.itemPrice.updatedAt,
        warehouse: schema.warehouse,
      })
      .from(schema.itemPrice)
      .leftJoin(schema.warehouse, eq(schema.itemPrice.warehouseId, schema.warehouse.id))
      .where(eq(schema.itemPrice.itemSlug, createdItem.slug));

    /* Prisma implementation (commented out)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json() as Item;
    const {
      articleId,
      isDisplayed,
      itemImageLink,
      itemPrice,
      itemDetails,
      categorySlug,
      subCategorySlug,
      brandSlug,
      warrantyType,
      warrantyLength,
    } = body;

    if (!articleId) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    const itemData: Prisma.ItemCreateInput = {
      articleId,
      isDisplayed,
      itemImageLink,
      category: {
        connect: { slug: categorySlug },
      },
      subCategory: {
        connect: { slug: subCategorySlug },
      },
      brand: brandSlug ? { connect: { alias: brandSlug } } : undefined,
      warrantyType: warrantyType || undefined,
      warrantyLength: typeof warrantyLength === 'number' ? warrantyLength : undefined,
      itemPrice: {
        create: itemPrice
          .filter((price: { warehouseId: string; }) => price.warehouseId)
          .map((price: { warehouseId: string; price: number; quantity: number; promotionPrice: number | null; promoEndDate: string | number | Date | null; promoCode: any; badge: any; }) => ({
            warehouseId: price.warehouseId!,
            price: price.price,
            quantity: price.quantity,
            promotionPrice: price.promotionPrice ?? null,
            promoEndDate: price.promoEndDate ? new Date(price.promoEndDate) : null,
            promoCode: price.promoCode || null,
            badge: price.badge || Badge.ABSENT,
          })),
      },
      itemDetails: {
        create: itemDetails.map((detail: { locale: any; itemName: any; description: any; specifications: any; seller: any; discount: any; popularity: any; }) => ({
          locale: detail.locale,
          itemName: detail.itemName,
          description: detail.description,
          specifications: detail.specifications,
          seller: detail.seller || null,
          discount: detail.discount ?? null,
          popularity: detail.popularity ?? null,
        })),
      },
    };

    if (brandSlug) {
      itemData.brand = { connect: { alias: brandSlug } };
    }

    const item = await db.item.create({
      data: itemData,
      include: {
        itemDetails: true,
        itemPrice: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const createdPrices = await db.itemPrice.findMany({
      where: { itemSlug: item.articleId },
    });

    if (createdPrices.length > 0) {
      await db.itemPriceHistory.createMany({
        data: createdPrices.map((price: any) => ({
          itemId: price.itemId,
          warehouseId: price.warehouseId,
          price: price.price,
          quantity: price.quantity,
          promotionPrice: price.promotionPrice,
          promoEndDate: price.promoEndDate,
          promoCode: price.promoCode,
          badge: price.badge || Badge.ABSENT,
        })),
      });
    }
    */

    const responseData = {
      ...createdItem,
      itemDetails: createdItemDetails,
      itemPrice: createdItemPrices,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
