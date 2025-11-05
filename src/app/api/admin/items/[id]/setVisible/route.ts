import db from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

        const data = await request.json();
        const updatedItem = await db.item.update({
            where: { id },
            data: { isDisplayed: data.isDisplayed }
        });
        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Error updating item visibility:', error);
        return NextResponse.json({ error: 'Failed to update item visibility' }, { status: 500 });
    }
}