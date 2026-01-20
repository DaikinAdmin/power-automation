// import db from "@/db";
import { db } from '@/db';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isUserAdmin } from '@/helpers/db/queries';

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

        const data = await request.json();
        
        // Drizzle implementation
        const [updatedItem] = await db
            .update(schema.item)
            .set({ 
                isDisplayed: data.isDisplayed,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.item.articleId, articleId))
            .returning();

        if (!updatedItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        /* Prisma implementation (commented out)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedItem = await db.item.update({
            where: { articleId },
            data: { isDisplayed: data.isDisplayed }
        });
        */

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Error updating item visibility:', error);
        return NextResponse.json({ error: 'Failed to update item visibility' }, { status: 500 });
    }
}