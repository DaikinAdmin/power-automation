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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        const data = await request.json();
        
        // Drizzle implementation
        const [updatedUser] = await db
            .update(schema.user)
            .set({
                role: data.role,
                emailVerified: data.emailVerified ? true : false,
                updatedAt: new Date(),
            })
            .where(eq(schema.user.id, id))
            .returning();
        
        // Update discount level via junction table if provided
        if (data.discountLevel) {
            // Remove existing discount level associations
            await db
                .delete(schema.discountLevelToUser)
                .where(eq(schema.discountLevelToUser.b, id));
            
            // Add new discount level association
            await db
                .insert(schema.discountLevelToUser)
                .values({
                    a: data.discountLevel,
                    b: id,
                });
        }

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        /* Prisma implementation (commented out)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedUser = await db.user.update({
            where: { id },
            data: {
                role: data.role,
                emailVerified: data.emailVerified,
                discountLevel: data.discountLevel
            }
        });
        */

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Prevent admin from deleting themselves
        if (id === session.user.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // Drizzle implementation
        await db.delete(schema.user).where(eq(schema.user.id, id));

        /* Prisma implementation (commented out)
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.user.delete({
            where: { id }
        });
        */

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
