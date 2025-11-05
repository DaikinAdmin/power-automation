import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Get current date and first day of previous month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Get total counts
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    const totalItems = await prisma.item.count();
    
    // Get previous month counts for growth calculation
    const previousMonthUsers = await prisma.user.count({
      where: {
        createdAt: {
          lt: currentMonth
        }
      }
    });
    
    const previousMonthOrders = await prisma.order.count({
      where: {
        createdAt: {
          lt: currentMonth,
          gte: previousMonth
        }
      }
    });
    
    const currentMonthOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: currentMonth
        }
      }
    });
    
    const previousMonthItems = await prisma.item.count({
      where: {
        createdAt: {
          lt: currentMonth
        }
      }
    });
    
    // Calculate revenue (sum of all completed orders)
    const currentMonthRevenue = await prisma.order.aggregate({
      _sum: {
        originalTotalPrice: true
      },
      where: {
        createdAt: {
          gte: currentMonth
        }
      }
    });
    
    const previousMonthRevenue = await prisma.order.aggregate({
      _sum: {
        originalTotalPrice: true
      },
      where: {
        createdAt: {
          lt: currentMonth,
          gte: previousMonth
        }
      }
    });
    
    // Calculate growth percentages
    const userGrowth = previousMonthUsers > 0 
      ? ((totalUsers - previousMonthUsers) / previousMonthUsers) * 100 
      : 100;
      
    const orderGrowth = previousMonthOrders > 0 
      ? ((currentMonthOrders - previousMonthOrders) / previousMonthOrders) * 100 
      : 100;
      
    const itemGrowth = previousMonthItems > 0 
      ? ((totalItems - previousMonthItems) / previousMonthItems) * 100 
      : 100;
      
    const currentRevenue = currentMonthRevenue._sum.originalTotalPrice || 0;
    const prevRevenue = previousMonthRevenue._sum.originalTotalPrice || 0;
    
    const revenueGrowth = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 
      : 100;
    
    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalItems,
      revenue: currentRevenue,
      userGrowth,
      orderGrowth,
      itemGrowth,
      revenueGrowth
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
