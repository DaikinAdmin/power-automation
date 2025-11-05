import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Badge } from '@prisma/client';
import { Item } from '@/helpers/types/item';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const item = await db.item.findUnique({
            where: { id: id },
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

        // Add debug logging
        console.log('API returning item:', {
            id: item.id,
            articleId: item.articleId,
            itemPriceCount: item.itemPrice?.length || 0,
            itemDetailsCount: item.itemDetails?.length || 0,
            itemPrice: item.itemPrice,
            itemDetails: item.itemDetails
        });

        return NextResponse.json(item);
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json() as Item;

        await db.$transaction([
            db.itemPrice.deleteMany({ where: { itemId: id } }),
            db.itemDetails.deleteMany({ where: { itemId: id } }),
        ]);

        const updatedItem = await db.item.update({
            where: { id },
            data: {
                articleId: data.articleId,
                isDisplayed: data.isDisplayed,
                itemImageLink: data.itemImageLink || null,
                category: { connect: { id: data.categoryId } },
                subCategory: { connect: { id: data.subCategoryId } },
                brand: data.brandId
                    ? { connect: { id: data.brandId } }
                    : { disconnect: true },
                brandName: data.brandName || undefined,
                warrantyType: data.warrantyType || undefined,
                warrantyLength: typeof data.warrantyLength === 'number' ? data.warrantyLength : undefined,
                updatedAt: new Date(),
                itemPrice: {
                    create: data.itemPrice
                        .filter((price) => price.warehouseId)
                        .map((price) => ({
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
                    create: data.itemDetails.map((detail) => ({
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
                data: updatedItem.itemPrice.map((price) => ({
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
        return NextResponse.json(updatedItem);
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete the item (cascade will handle related records)
        await db.item.delete({
            where: { id },
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        return Response.json(
            { error: 'Failed to delete item' },
            { status: 500 }
        );
    }
}
