import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';
import { UploadType } from '@/helpers/types/item';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Fetch all items with related data
    const items = await prisma.item.findMany({
      include: {
        category: true,
        subCategory: true,
        brand: true,
        itemDetails: true,
        itemPrice: {
          include: {
            warehouse: true,
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Transform items to UploadType format
    const exportData: UploadType[] = [];

    items.forEach((item: any) => {
      // Create base item data
      const baseItemData = {
        articleId: item.articleId,
        isDisplayed: item.isDisplayed,
        itemImageLink: item.itemImageLink || '',
        categoryName: item.category.name,
        subCategoryName: item.subCategory.name,
        brandName: item.brand?.name || item.brandName || '',
        warrantyType: item.warrantyType || '',
        warrantyLength: item.warrantyLength || 0,
        sellCounter: item.sellCounter || 0,
      };

      // Handle cases where there are no details or prices
      if (item.itemDetails.length === 0 && item.itemPrice.length === 0) {
        exportData.push({
          ...baseItemData,
          locale: 'pl',
          itemName: '',
          description: '',
          specifications: '',
          seller: '',
          discount: 0,
          popularity: 0,
          warehouseName: '',
          price: 0,
          quantity: 0,
          promotionPrice: 0,
          promoCode: '',
          promoEndDate: '',
          badge: '',
        });
        return;
      }

      // Create combinations of details and prices
      const details = item.itemDetails.length > 0 ? item.itemDetails : [null];
      const prices = item.itemPrice.length > 0 ? item.itemPrice : [null];

      details.forEach((detail: any) => {
        prices.forEach((price: any) => {
          exportData.push({
            ...baseItemData,
            locale: detail?.locale || 'pl',
            itemName: detail?.itemName || '',
            description: detail?.description || '',
            specifications: detail?.specifications || '',
            seller: detail?.seller || '',
            discount: detail?.discount || 0,
            popularity: detail?.popularity || 0,
            warehouseName: price?.warehouse?.name || '',
            price: price?.price || 0,
            quantity: price?.quantity || 0,
            promotionPrice: price?.promotionPrice || 0,
            promoCode: price?.promoCode || '',
            promoEndDate: price?.promoEndDate?.toISOString() || '',
            badge: price?.badge || '',
          });
        });
      });
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'articleId', 'isDisplayed', 'itemImageLink', 'categoryName', 'subCategoryName',
        'brandName', 'warrantyType', 'warrantyLength', 'sellCounter', 'locale',
        'itemName', 'description', 'specifications', 'seller', 'discount',
        'popularity', 'warehouseName', 'price', 'quantity', 'promotionPrice',
        'promoCode', 'promoEndDate', 'badge'
      ];

      const csvRows = exportData.map(item => 
        csvHeaders.map(header => {
          const value = item[header as keyof UploadType];
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const stringValue = String(value || '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="items_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Return JSON format
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="items_export_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

  } catch (error) {
    console.error('Error exporting items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
