import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(req: NextRequest) {
  try {
    // Get 5 most recent orders
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
    
    // Format the orders for the frontend
    const formattedOrders = recentOrders.map((order: { id: any; user: { name: any; }; totalPrice: any; originalTotalPrice: any; status: any; createdAt: { toISOString: () => any; }; }) => ({
      id: order.id,
      customerName: order.user.name,
      totalPriceFormatted: order.totalPrice,
      originalTotalPrice: order.originalTotalPrice,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));
    
    return NextResponse.json(formattedOrders);
    
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent orders' },
      { status: 500 }
    );
  }
}
