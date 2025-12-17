import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { db } from '@/db';
import { gte, lt, and, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';

export async function GET(req: NextRequest) {
  try {
    // Get current date and first day of previous month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // For string timestamp comparisons
    const currentMonthStr = currentMonth.toISOString();
    const previousMonthStr = previousMonth.toISOString();
    
    // Get total counts
    const [totalUsersResult] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(schema.user);
    const totalUsers = totalUsersResult.count;
    
    const [totalOrdersResult] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(schema.order);
    const totalOrders = totalOrdersResult.count;
    
    const [totalItemsResult] = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(schema.item);
    const totalItems = totalItemsResult.count;
    
    // Get previous month counts
    const [previousMonthUsersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.user)
      .where(lt(schema.user.createdAt, currentMonth));
    const previousMonthUsers = previousMonthUsersResult.count;
    
    const [previousMonthOrdersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order)
      .where(and(lt(schema.order.createdAt, currentMonthStr), gte(schema.order.createdAt, previousMonthStr)));
    const previousMonthOrders = previousMonthOrdersResult.count;
    
    const [currentMonthOrdersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order)
      .where(gte(schema.order.createdAt, currentMonthStr));
    const currentMonthOrders = currentMonthOrdersResult.count;
    
    const [previousMonthItemsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(lt(schema.item.createdAt, currentMonthStr));
    const previousMonthItems = previousMonthItemsResult.count;
    
    // Calculate revenue
    const [currentMonthRevenueResult] = await db
      .select({ sum: sql<number>`cast(sum(${schema.order.originalTotalPrice}) as double precision)` })
      .from(schema.order)
      .where(gte(schema.order.createdAt, currentMonthStr));
    
    const [previousMonthRevenueResult] = await db
      .select({ sum: sql<number>`cast(sum(${schema.order.originalTotalPrice}) as double precision)` })
      .from(schema.order)
      .where(and(lt(schema.order.createdAt, currentMonthStr), gte(schema.order.createdAt, previousMonthStr)));
    
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
      
    const currentRevenue = currentMonthRevenueResult?.sum || 0;
    const prevRevenue = previousMonthRevenueResult?.sum || 0;
    
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
