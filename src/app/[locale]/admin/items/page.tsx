'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemModal } from '@/components/admin/item-modal';
import { DeleteItemModal } from '@/components/admin/delete-item-modal';
import { BulkUploadModal } from '@/components/admin/bulk-upload-modal';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Upload, Download } from 'lucide-react';
import { Item } from '@/helpers/types/item';
import { usePagination } from '@/hooks/usePagination';
import { ListActionButtons } from '@/components/admin/list-action-buttons';


export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems,
    goToNextPage,
    goToPreviousPage,
    pageSize
  } = usePagination<Item>({ data: items, pageSize: 5 });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/items');
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        console.error('Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = () => {
    router.push('/admin/items/new');
  };

  const handleEditItem = (item: Item) => {
    router.push(`/admin/items/${item.id}/edit`);
  }; 
  
  const handleDeleteItem = (item: Item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSaveItem = async (itemData: any) => {
    try {
      if (selectedItem) {
        // Update existing item
        const response = await fetch(`/api/admin/items/${selectedItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        if (response.ok) {
          await fetchItems();
        } else {
          console.error('Failed to update item');
        }
      } else {
        // Create new item
        const response = await fetch('/api/admin/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        if (response.ok) {
          await fetchItems();
        } else {
          console.error('Failed to create item');
        }
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleConfirmDelete = async (item: any) => {
    try {
      const response = await fetch(`/api/admin/items/${item.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchItems();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleToggleDisplay = async (item: Item) => {
    try {
      const response = await fetch(`/api/admin/items/${item.id}/setVisible`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          isDisplayed: !item.isDisplayed,
        }),
      });

      if (response.ok) {
        await fetchItems();
      } else {
        console.error('Failed to update item display status');
      }
    } catch (error) {
      console.error('Error updating item display status:', error);
    }
  };

  const handleBulkUploadSuccess = () => {
    fetchItems(); // Refresh the items list
  };

  const handleDownloadItems = async (format: 'json' | 'csv') => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/admin/items/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to download items');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `items_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading items:', error);
      alert('Failed to download items');
    } finally {
      setIsDownloading(false);
    }
  };

  const itemStats = {
    total: items.length,
    displayed: items.filter(item => item.isDisplayed).length,
    hidden: items.filter(item => !item.isDisplayed).length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items Management</h1>
          <p className="text-gray-600">
            Manage all products and inventory items.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Button 
              variant="outline" 
              onClick={() => {
                const dropdown = document.getElementById('download-dropdown');
                dropdown?.classList.toggle('hidden');
              }}
              disabled={isDownloading}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download Items'}
            </Button>
            <div 
              id="download-dropdown" 
              className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden"
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    handleDownloadItems('json');
                    document.getElementById('download-dropdown')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Download as JSON
                </button>
                <button
                  onClick={() => {
                    handleDownloadItems('csv');
                    document.getElementById('download-dropdown')?.classList.add('hidden');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Download as CSV
                </button>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsBulkUploadOpen(true)}
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={handleCreateItem} className="bg-blue-600 text-white hover:bg-blue-700">
            Add New Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Displayed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemStats.displayed}</div>
            <p className="text-xs text-gray-600">
              {itemStats.total > 0 ? Math.round((itemStats.displayed / itemStats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemStats.hidden}</div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
          <CardDescription>
            Manage your inventory items with full CRUD operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Image</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Article ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => {
                  const details = item.itemDetails[0];

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {item.itemImageLink ? (
                          <img
                            src={item.itemImageLink}
                            alt={details?.itemName || 'Item'}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{item.articleId}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleDisplay(item)}
                            className="h-8 w-8 p-0"
                          >
                            {item.isDisplayed ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <span className="text-sm text-gray-600">
                            {item.isDisplayed ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <ListActionButtons
                          item={item}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                        />
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No items found. Add your first item to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, items.length)} of {items.length} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        item={selectedItem}
      />

      <DeleteItemModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        item={selectedItem}
      />

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
}
