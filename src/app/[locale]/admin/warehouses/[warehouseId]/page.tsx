'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from '@/i18n/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Package, 
  ArrowLeft, 
  ExternalLink,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { Link } from '@/i18n/navigation';

interface WarehouseItem {
  id: string;
  itemSlug: string;
  articleId: string;
  price: number;
  initialPrice: number | null;
  initialCurrency: string | null;
  margin: number;
  quantity: number;
  itemName: string;
  photo: string[];
}

interface WarehouseData {
  warehouse: {
    id: string;
    name: string;
    displayedName: string;
    countrySlug: string;
  };
  prices: WarehouseItem[];
}

export default function WarehouseItemsPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/warehouses/${warehouseId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching warehouse items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [warehouseId]);

  // Фільтрація перед пагінацією
  const filteredItems = data?.prices.filter((item) =>
    item.articleId.toLowerCase().includes(search.toLowerCase()) ||
    item.itemName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Використання вашого хука пагінації (pageSize: 10 для товарів)
  const {
    currentPage,
    totalPages,
    currentItems,
    goToNextPage,
    goToPreviousPage,
    pageSize
  } = usePagination<WarehouseItem>({ data: filteredItems, pageSize: 10 });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>)}
        </div>
        <div className="h-96 bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-red-500 font-bold">Warehouse not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Link 
            href="/admin/warehouses" 
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Warehouses
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {data.warehouse.name} Inventory
          </h1>
          <p className="text-gray-600">
            Managing stocks for {data.warehouse.displayedName} ({data.warehouse.countrySlug}).
          </p>
        </div>
      </div>

      {/* Stats - в стилі вашої сторінки */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.prices.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.prices.filter(p => p.quantity < 5).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data.prices.reduce((acc, curr) => acc + curr.margin, 0) / (data.prices.length || 1)).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventory List</CardTitle>
              <CardDescription>Click rows to edit item pricing and stock.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by article or name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Photo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Article</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Price</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Margin</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Initial</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Qty</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/admin/items/${item.itemSlug}/edit`)}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="h-10 w-10 rounded border bg-white overflow-hidden shadow-sm">
                        <img
                          src={item.photo?.[0] || '/placeholder.png'}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-blue-600 group-hover:underline flex items-center">
                        {item.articleId}
                        <ExternalLink className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">
                        {item.itemName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {item.price.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {item.margin}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-sm">
                      {item.initialPrice ? `${item.initialPrice} ${item.initialCurrency}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${
                        item.quantity <= 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-900'
                      }`}>
                        {item.quantity}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination - ідентично вашій сторінці */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm font-medium mx-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-20 text-gray-400 italic">
              No products found in this warehouse.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}