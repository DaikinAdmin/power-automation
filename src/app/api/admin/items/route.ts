import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createHash } from 'crypto';
// import prisma from '@/db';
import { db } from '@/db';
import { Item } from '@/helpers/types/item';
import { eq, desc } from 'drizzle-orm';
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
    
    logger.info('Fetching all items (admin)', { userId: session.user.id });

    // Drizzle implementation with new category/subcategory logic
    const items = await db
      .select()
      .from(schema.item)
      .orderBy(desc(schema.item.id));

    // Fetch related data for each item
    const itemsWithRelations = await Promise.all(
      items.map(async (item) => {
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
          db.select().from(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, item.articleId)),
          db.select({
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
            .where(eq(schema.itemPrice.itemSlug, item.articleId)),
        ]);

        return {
          id: item.id,
          articleId: item.articleId,
          slug: item.slug,
          alias: item.alias,
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

    // Calculate ETag based on data
    const dataString = JSON.stringify(itemsWithRelations);
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

    const response = NextResponse.json(itemsWithRelations);
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error fetching items:', error);
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
