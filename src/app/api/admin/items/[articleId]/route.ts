import { NextRequest, NextResponse } from 'next/server';
// import db from '@/db';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { Badge } from '@/db/schema';
import { Item } from '@/helpers/types/item';
import { eq, asc } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ articleId: string }> }
) {
    try {
        const { articleId } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Drizzle implementation with new category/subcategory logic
        const [item] = await db
            .select()
            .from(schema.item)
            .where(eq(schema.item.articleId, articleId))
            .limit(1);

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

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
                // It's a category - fetch subcategories
                const subCategories = await db
                    .select()
                    .from(schema.subcategories)
                    .where(eq(schema.subcategories.categorySlug, foundCategory.slug));
                category = { ...foundCategory, subCategories };
            } else {
                // Try to find in subcategories
                const [foundSubCategory] = await db
                    .select()
                    .from(schema.subcategories)
                    .where(eq(schema.subcategories.slug, item.categorySlug))
                    .limit(1);

                if (foundSubCategory) {
                    subCategory = foundSubCategory;
                    // Get parent category with its subcategories
                    const [parentCategory] = await db
                        .select()
                        .from(schema.category)
                        .where(eq(schema.category.slug, foundSubCategory.categorySlug))
                        .limit(1);
                    
                    if (parentCategory) {
                        const subCategories = await db
                            .select()
                            .from(schema.subcategories)
                            .where(eq(schema.subcategories.categorySlug, parentCategory.slug));
                        category = { ...parentCategory, subCategories };
                    }
                }
            }
        }

        // Fetch other related data
        const [brand, itemPriceData, itemDetails] = await Promise.all([
            item.brandSlug
                ? db.select().from(schema.brand).where(eq(schema.brand.alias, item.brandSlug)).limit(1).then(r => r[0])
                : null,
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
                .where(eq(schema.itemPrice.itemSlug, articleId))
                .orderBy(asc(schema.itemPrice.createdAt)),
            db.select().from(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, articleId)).orderBy(asc(schema.itemDetails.locale)),
        ]);

        const itemWithRelations = {
            ...item,
            category,
            subCategory,
            brand,
            itemPrice: itemPriceData,
            itemDetails,
        };

        /* Prisma implementation (commented out)
        const item = await db.item.findUnique({
            where: { articleId: articleId },
            include: {
                category: {
                    include: {
                        subCategories: true
                    }
                },
                subCategory: true,
                brand: true,
                itemPrice: {
                    include: {
                        warehouse: true
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                itemDetails: {
                    orderBy: {
                        locale: 'asc'
                    }
                }
            },
        });

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        */

        console.log('API returning item:', {
            id: itemWithRelations.id,
            articleId: itemWithRelations.articleId,
            itemPriceCount: itemWithRelations.itemPrice?.length || 0,
            itemDetailsCount: itemWithRelations.itemDetails?.length || 0,
            itemPrice: itemWithRelations.itemPrice,
            itemDetails: itemWithRelations.itemDetails
        });

        return NextResponse.json(itemWithRelations);
    } catch (error) {
        console.error('Error fetching item:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ articleId: string }> }
) {
    try {
        const { articleId } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isUserAdmin(session.user.id);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json() as Item;
        const now = new Date().toISOString();

        // Drizzle implementation with new category/subcategory logic
        // First, find the item
        const [existingItem] = await db
            .select()
            .from(schema.item)
            .where(eq(schema.item.articleId, articleId))
            .limit(1);

        if (!existingItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // Determine if categorySlug is a category or subcategory
        let finalCategorySlug = data.categorySlug;
        if (data.categorySlug) {
            // Check if it's a category
            const [category] = await db
                .select()
                .from(schema.category)
                .where(eq(schema.category.slug, data.categorySlug))
                .limit(1);

            if (!category) {
                // Check if it's a subcategory
                const [subCategory] = await db
                    .select()
                    .from(schema.subcategories)
                    .where(eq(schema.subcategories.slug, data.categorySlug))
                    .limit(1);

                if (subCategory) {
                    // Use subcategory slug as categorySlug
                    finalCategorySlug = subCategory.slug;
                }
            }
        }

        // Delete existing prices and details
        await db
            .delete(schema.itemPrice)
            .where(eq(schema.itemPrice.itemSlug, articleId));

        await db
            .delete(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, articleId));

        // Update the item
        const [updatedItem] = await db
            .update(schema.item)
            .set({
                articleId: data.articleId,
                isDisplayed: data.isDisplayed,
                itemImageLink: data.itemImageLink || null,
                categorySlug: finalCategorySlug || '',
                brandSlug: data.brandSlug || null,
                warrantyType: data.warrantyType || null,
                warrantyLength: data.warrantyLength || null,
                updatedAt: now,
            })
            .where(eq(schema.item.articleId, articleId))
            .returning();

        // Create new item prices
        if (data.itemPrice && data.itemPrice.length > 0) {
            const priceRecords = data.itemPrice
                .filter((price: any) => price.warehouseId)
                .map((price: any) => ({
                    id: crypto.randomUUID(),
                    itemId: updatedItem.id,
                    itemSlug: updatedItem.articleId,
                    warehouseId: price.warehouseId,
                    price: price.price,
                    quantity: price.quantity,
                    promotionPrice: price.promotionPrice ?? null,
                    promoEndDate: price.promoEndDate ? new Date(price.promoEndDate).toISOString() : null,
                    promoCode: price.promoCode || null,
                    badge: price.badge || 'ABSENT',
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

        // Create new item details
        if (data.itemDetails && data.itemDetails.length > 0) {
            const detailRecords = data.itemDetails.map((detail: any) => ({
                id: crypto.randomUUID(),
                itemSlug: updatedItem.articleId,
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

        // Fetch the updated item with relations
        const updatedItemDetails = await db
            .select()
            .from(schema.itemDetails)
            .where(eq(schema.itemDetails.itemSlug, updatedItem.articleId));

        const updatedItemPrices = await db
            .select()
            .from(schema.itemPrice)
            .where(eq(schema.itemPrice.itemSlug, updatedItem.articleId));

        /* Prisma implementation (commented out)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json() as Item;

        await db.$transaction([
            db.itemPrice.deleteMany({ where: { itemSlug: articleId } }),
            db.itemDetails.deleteMany({ where: { itemSlug: articleId } }),
        ]);

        const updatedItem = await db.item.update({
            where: { articleId },
            data: {
                articleId: data.articleId,
                isDisplayed: data.isDisplayed,
                itemImageLink: data.itemImageLink || null,
                category: { connect: { id: data.categorySlug } },
                subCategory: { connect: { id: data.subCategorySlug } },
                brand: data.brandSlug
                    ? { connect: { alias: data.brandSlug } }
                    : { disconnect: true },
                warrantyType: data.warrantyType || undefined,
                warrantyLength: typeof data.warrantyLength === 'number' ? data.warrantyLength : undefined,
                updatedAt: new Date().toISOString(),
                itemPrice: {
                    create: data.itemPrice
                        .filter((price: { warehouseId: any; }) => price.warehouseId)
                        .map((price: { warehouseId: any; price: any; quantity: any; promotionPrice: any; promoEndDate: string | number | Date | null; promoCode: any; badge: any; }) => ({
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
                    create: data.itemDetails.map((detail: { locale: any; itemName: any; description: any; specifications: any; seller: any; discount: any; popularity: any; }) => ({
                        locale: detail.locale,
                        itemName: detail.itemName,
                        description: detail.description,
                        specifications: detail.specifications,
                        seller: detail.seller || null,
                        discount: detail.discount ?? null,
                        popularity: detail.popularity ?? null,
                    })),
                },
            },
            include: {
                itemPrice: true,
                itemDetails: true,
            },
        });

        if (updatedItem.itemPrice.length > 0) {
            await db.itemPriceHistory.createMany({
                data: updatedItem.itemPrice.map((price: {
                    warehouseId: string;
                    price: number;
                    quantity: number;
                    promotionPrice: number | null;
                    promoEndDate: Date | null;
                    promoCode: string | null;
                    badge: Badge | null;
                }) => ({
                    itemId: updatedItem.id,
                    warehouseId: price.warehouseId,
                    price: price.price,
                    quantity: price.quantity,
                    promotionPrice: price.promotionPrice,
                    promoEndDate: price.promoEndDate,
                    promoCode: price.promoCode,
                    badge: price.badge || Badge.ABSENT,
                }))
            });
        }
        */

        const responseData = {
            ...updatedItem,
            itemDetails: updatedItemDetails,
            itemPrice: updatedItemPrices,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error updating item:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ articleId: string }> }
) {
    try {
        const { articleId } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isUserAdmin(session.user.id);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get the item's ID first
        const [itemToDelete] = await db
            .select({ id: schema.item.id })
            .from(schema.item)
            .where(eq(schema.item.articleId, articleId))
            .limit(1);

        if (!itemToDelete) {
            return NextResponse.json({ message: 'Item not found' }, { status: 404 });
        }

        // Delete related records first (manually handle cascade)
        await db.delete(schema.itemPrice).where(eq(schema.itemPrice.itemSlug, articleId));
        await db.delete(schema.itemDetails).where(eq(schema.itemDetails.itemSlug, articleId));
        await db.delete(schema.itemPriceHistory).where(eq(schema.itemPriceHistory.itemId, itemToDelete.id));
        
        // Delete the item
        await db.delete(schema.item).where(eq(schema.item.articleId, articleId));

        /* Prisma implementation (commented out)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.item.delete({
            where: { articleId },
        });
        */

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return Response.json(
            { error: 'Failed to delete item' },
            { status: 500 }
        );
    }
}
