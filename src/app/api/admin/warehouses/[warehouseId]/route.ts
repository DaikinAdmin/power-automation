import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const { warehouseId } = await params;
    
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

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, country, isVisible, displayedName } = body;

    if (!name || !country) {
      return NextResponse.json({ error: 'Name and country are required' }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        name,
        country,
        isVisible,
        displayedName
      }
    });

    return NextResponse.json(warehouse);
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ warehouseId: string }> }
) {
  try {
    const { warehouseId } = await params;
    
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

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if warehouse has associated item prices
    const warehouseWithPrices = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        _count: {
          select: {
            item_price: true
          }
        }
      }
    });

    if (!warehouseWithPrices) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    }

    if (warehouseWithPrices._count.item_price > 0) {
      return NextResponse.json(
        { error: 'Cannot delete warehouse with associated item prices' }, 
        { status: 400 }
      );
    }

    await prisma.warehouse.delete({
      where: { id: warehouseId }
    });

    return NextResponse.json({ message: 'Warehouse deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
