import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { db } from '@/db';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@/db/schema';

export async function GET(req: NextRequest) {
  try {
    // Get 5 most recent orders with user data
    const recentOrders = await db
      .select({
        id: schema.order.id,
        totalPrice: schema.order.totalPrice,
        originalTotalPrice: schema.order.originalTotalPrice,
        status: schema.order.status,
        createdAt: schema.order.createdAt,
        userName: schema.user.name,
      })
      .from(schema.order)
      .leftJoin(schema.user, eq(schema.order.userId, schema.user.id))
      .orderBy(desc(schema.order.createdAt))
      .limit(5);
    
    // Format the orders for the frontend
    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      customerName: order.userName,
      totalPriceFormatted: order.totalPrice,
      originalTotalPrice: order.originalTotalPrice,
      status: order.status,
      createdAt: order.createdAt,
    }));
    
    /* Prisma implementation (commented out)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      customerName: order.user.name,
      totalPriceFormatted: order.totalPrice,
      originalTotalPrice: order.originalTotalPrice,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));
    */
    
    return NextResponse.json(formattedOrders);
    
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent orders' },
      { status: 500 }
    );
  }
}
