'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemModal } from '@/components/admin/item-modal';
import { DeleteItemModal } from '@/components/admin/delete-item-modal';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Item } from '@/helpers/types/item';
import { ListActionButtons } from '@/components/admin/list-action-buttons';
import { useAdminItems } from '@/hooks/useAdminItems';
import { useAdminBrands } from '@/hooks/useAdminBrands';
import { toast } from 'sonner';

export default function ItemsPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchInput, setSearchInput] = useState(''); // User's input
  const [searchTerm, setSearchTerm] = useState(''); // Actual search term sent to API
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [hideHidden, setHideHidden] = useState(false);
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  // Custom hooks for data fetching
  const { brands: allBrands } = useAdminBrands();
  const {
    items,
    isLoading,
    stats,
    pagination,
    filters,
    refetch: refetchItems,
  } = useAdminItems({
    currentPage,
    pageSize,
    searchTerm,
    selectedBrand,
    selectedCategory,
    hideHidden,
  });

  // Debounce search input - only search after user stops typing for 500ms and has 3+ chars
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger search if input is empty (clear search) or has 3+ characters
      if (searchInput === '' || searchInput.length >= 3) {
        setSearchTerm(searchInput);
        setCurrentPage(1); // Reset to first page on search
        setSelectedItems(new Set()); // Clear selection on search
        setSelectAllMode('none');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedItems(new Set());
    setSelectAllMode('none');
  }, [selectedBrand, selectedCategory, currentPage, hideHidden]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAllMode === 'none') {
      // Select all items on current page
      const newSelected = new Set(items.map(item => item.slug));
      setSelectedItems(newSelected);
      setSelectAllMode('page');
    } else if (selectAllMode === 'page') {
      // Extend to all filtered items
      setSelectAllMode('all');
    } else {
      // Deselect all
      setSelectedItems(new Set());
      setSelectAllMode('none');
    }
  };

  const handleSelectItem = (slug: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      newSelected.add(slug);
    }
    setSelectedItems(newSelected);
    
    // Update select all mode
    if (newSelected.size === 0) {
      setSelectAllMode('none');
    } else if (newSelected.size === items.length && selectAllMode !== 'all') {
      setSelectAllMode('page');
    } else if (selectAllMode === 'all' || selectAllMode === 'page') {
      setSelectAllMode('none');
    }
  };

  const isAllOnPageSelected = items.length > 0 && items.every(item => selectedItems.has(item.slug));

  // Batch action handlers
  const handleBatchAction = async (action: 'show' | 'hide' | 'delete') => {
    if (selectAllMode === 'none' && selectedItems.size === 0) {
      return;
    }

    const confirmMessage = selectAllMode === 'all'
      ? `Are you sure you want to ${action} ALL ${pagination.totalItems} filtered items?`
      : `Are you sure you want to ${action} ${selectedItems.size} selected item(s)?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessingBatch(true);

    try {
      const endpoint = action === 'delete' ? '/api/admin/items/batch-delete' : '/api/admin/items/batch-update';
      
      const body = selectAllMode === 'all'
        ? {
            action: action === 'delete' ? undefined : action,
            filters: {
              searchTerm: searchTerm || undefined,
              brandSlug: selectedBrand || undefined,
              categorySlug: selectedCategory || undefined,
            }
          }
        : {
            action: action === 'delete' ? undefined : action,
            itemSlugs: Array.from(selectedItems),
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success toast
        toast.success('Batch Action Completed!', {
          description: result.message,
          duration: 5000,
        });
        
        // Clear selection and refresh
        setSelectedItems(new Set());
        setSelectAllMode('none');
        await refetchItems();
      } else {
        const error = await response.json();
        toast.error('Batch Action Failed', {
          description: error.error || 'Failed to perform batch action',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Batch action error:', error);
      toast.error('Batch Action Failed', {
        description: 'Network error occurred',
        duration: 5000,
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const getSelectionText = () => {
    if (selectAllMode === 'all') {
      return `All ${pagination.totalItems} filtered items selected`;
    } else if (selectedItems.size > 0) {
      return `${selectedItems.size} item(s) selected on this page`;
    }
    return '';
  };

  const handleCreateItem = () => {
    router.push('/admin/items/new');
  };

  const handleEditItem = (item: Item) => {
    router.push(`/admin/items/${item.slug}/edit`);
  }; 
  
  const handleDeleteItem = (item: Item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSaveItem = async (itemData: any) => {
    try {
      if (selectedItem) {
        // Update existing item
        const response = await fetch(`/api/admin/items/${selectedItem.slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });

        if (response.ok) {
          await refetchItems();
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
          await refetchItems();
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
      const response = await fetch(`/api/admin/items/${item.slug}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refetchItems();
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
      const response = await fetch(`/api/admin/items/${item.slug}/setVisible`, {
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
        await refetchItems();
      } else {
        console.error('Failed to update item display status');
      }
    } catch (error) {
      console.error('Error updating item display status:', error);
    }
  };



  const goToNextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
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
          <Button onClick={handleCreateItem} className="bg-blue-600 text-white hover:bg-blue-700">
            Add New Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-600">All items in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.selected}</div>
            <p className="text-xs text-gray-600">
              {stats.total > 0 ? Math.round((stats.selected / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Displayed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.displayed}</div>
            <p className="text-xs text-gray-600">
              {stats.selected > 0 ? Math.round((stats.displayed / stats.selected) * 100) : 0}% of selected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hidden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hidden}</div>
            <p className="text-xs text-gray-600">
              {stats.selected > 0 ? Math.round((stats.hidden / stats.selected) * 100) : 0}% of selected
            </p>
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
          <div className="mb-4 space-y-3">
            <div>
              <input
                type="text"
                placeholder="Search by article ID, alias, or brand (min 3 characters)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchInput.length > 0 && searchInput.length < 3 && (
                <p className="text-xs text-gray-500 mt-1">Type at least 3 characters to search</p>
              )}
              {searchInput.length >= 3 && searchInput !== searchTerm && (
                <p className="text-xs text-blue-500 mt-1">Searching...</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Brands</option>
                  {allBrands.map((brand) => (
                    <option key={brand.alias} value={brand.alias}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {filters.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hide Hidden</label>
                <button
                  onClick={() => {
                    setHideHidden(!hideHidden);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2 ${
                    hideHidden
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {hideHidden ? (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Visible Only</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Show All</span>
                    </>
                  )}
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="5">5 items</option>
                  <option value="10">10 items</option>
                  <option value="20">20 items</option>
                  <option value="50">50 items</option>
                  <option value="100">100 items</option>
                </select>
              </div>
            </div>
            
            {(searchTerm || selectedBrand || selectedCategory || hideHidden) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setSelectedBrand('');
                  setSelectedCategory('');
                  setHideHidden(false);
                  setCurrentPage(1);
                }}
                className="text-gray-600"
              >
                Clear All Filters
              </Button>
            )}
          </div>
          
          {/* Batch Actions Bar */}
          {selectedItems.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900">
                    {getSelectionText()}
                  </span>
                  {selectAllMode === 'page' && pagination.totalItems > items.length && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSelectAllMode('all')}
                      className="text-blue-600 underline h-auto p-0"
                    >
                      Select all {pagination.totalItems} items
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAction('show')}
                    disabled={isProcessingBatch}
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Make Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAction('hide')}
                    disabled={isProcessingBatch}
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Hide
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchAction('delete')}
                    disabled={isProcessingBatch}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    🗑️ Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItems(new Set());
                      setSelectAllMode('none');
                    }}
                    disabled={isProcessingBatch}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm w-12">
                    <input
                      type="checkbox"
                      checked={isAllOnPageSelected || selectAllMode === 'all'}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title={selectAllMode === 'all' ? 'All filtered items selected' : 'Select all on page'}
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Image</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Article ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Brand</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Quantity</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const details = item.itemDetails[0];
                  const totalQuantity = item.itemPrice?.reduce((sum, price) => sum + (price.quantity || 0), 0) || 0;

                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.slug) || selectAllMode === 'all'}
                          onChange={() => handleSelectItem(item.slug)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {item.itemImageLink ? (
                          <img
                            src={item.itemImageLink[0]}
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {item.brandSlug || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {totalQuantity}
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
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      {searchTerm || selectedBrand || selectedCategory ? 'No items match your filters.' : 'No items found. Add your first item to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, pagination.totalItems)} of {pagination.totalItems} items
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
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === pagination.totalPages}
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
    </div>
  );
}
