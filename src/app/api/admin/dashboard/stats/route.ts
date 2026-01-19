import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/db';
import { db } from '@/db';
import { gte, lt, and, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import logger from '@/lib/logger';
import { apiErrorHandler } from '@/lib/error-handler';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    logger.info('Fetching dashboard stats', {
      endpoint: 'GET /api/admin/dashboard/stats',
    });

    // Get current date and first day of previous month
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // For tables storing timestamps as strings (e.g., order)
    const currentMonth = currentMonthDate.toISOString();
    const previousMonth = previousMonthDate.toISOString();
    
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
      .where(lt(schema.user.createdAt, currentMonthDate));
    const previousMonthUsers = previousMonthUsersResult.count;
    
    const [previousMonthOrdersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order)
      .where(and(lt(schema.order.createdAt, currentMonth), gte(schema.order.createdAt, previousMonth)));
    const previousMonthOrders = previousMonthOrdersResult.count;
    
    const [currentMonthOrdersResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.order)
      .where(gte(schema.order.createdAt, currentMonth));
    const currentMonthOrders = currentMonthOrdersResult.count;
    
    const [previousMonthItemsResult] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(schema.item)
      .where(lt(schema.item.createdAt, currentMonth));
    const previousMonthItems = previousMonthItemsResult.count;
    
    // Calculate revenue
    const [currentMonthRevenueResult] = await db
      .select({ sum: sql<number>`cast(sum(${schema.order.originalTotalPrice}) as double precision)` })
      .from(schema.order)
      .where(gte(schema.order.createdAt, currentMonth));
    
    const [previousMonthRevenueResult] = await db
      .select({ sum: sql<number>`cast(sum(${schema.order.originalTotalPrice}) as double precision)` })
      .from(schema.order)
      .where(and(lt(schema.order.createdAt, currentMonth), gte(schema.order.createdAt, previousMonth)));
    
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
    
    const duration = Date.now() - startTime;
    logger.info('Dashboard stats fetched successfully', {
      endpoint: 'GET /api/admin/dashboard/stats',
      totalUsers,
      totalOrders,
      totalItems,
      currentRevenue,
      duration,
    });

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
    return apiErrorHandler(error, req, { endpoint: 'GET /api/admin/dashboard/stats' });
  }
}
