'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WarehouseModal } from '@/components/admin/warehouse-modal';
import { DeleteWarehouseModal } from '@/components/admin/delete-warehouse-modal';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Warehouse as Warehouses} from '@/db/schema';
import { usePagination } from '@/hooks/usePagination';
import { ListActionButtons } from '@/components/admin/list-action-buttons';

interface Warehouse extends Warehouses {
  id: string;
  isVisible: any;
  displayedName: string;
  name: string | null;
  _count?: {
    item_price: number;
  };
  countrySlug: string | null;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems: currentWarehouses,
    goToNextPage,
    goToPreviousPage,
    pageSize
  } = usePagination<Warehouse>({ data: warehouses, pageSize: 5 });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      } else {
        console.error('Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWarehouse = () => {
    setSelectedWarehouse(null);
    setIsModalOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsModalOpen(true);
  };

  const handleDeleteWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDeleteModalOpen(true);
  };

  const handleSaveWarehouse = async (warehouseData: Omit<Warehouse, 'id'> | Warehouse) => {
    try {
      console.log('Saving warehouse:', warehouseData);
      if (selectedWarehouse) {
        // Update existing warehouse
        const response = await fetch(`/api/admin/warehouses/${selectedWarehouse.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(warehouseData),
        });

        if (response.ok) {
          await fetchWarehouses();
        } else {
          console.error('Failed to update warehouse');
        }
      } else {
        // Create new warehouse
        const response = await fetch('/api/admin/warehouses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(warehouseData),
        });

        if (response.ok) {
          await fetchWarehouses();
        } else {
          console.error('Failed to create warehouse');
        }
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
    }
  };

  const handleConfirmDelete = async (warehouse: Warehouse) => {
    try {
      const response = await fetch(`/api/admin/warehouses/${warehouse.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWarehouses();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete warehouse');
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
    }
  };

  const handleToggleVisibility = async (warehouse: Warehouse) => {
    try {
      const response = await fetch(`/api/admin/warehouses/${warehouse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...warehouse,
          isVisible: !warehouse.isVisible,
        }),
      });

      if (response.ok) {
        await fetchWarehouses();
      } else {
        console.error('Failed to update warehouse visibility');
      }
    } catch (error) {
      console.error('Error updating warehouse visibility:', error);
    }
  };

  const getUniqueCountries = () => {
    return new Set(warehouses.map(w => w.countrySlug)).size;
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
          <h1 className="text-3xl font-bold tracking-tight">Warehouses Management</h1>
          <p className="text-gray-600">
            Manage warehouse locations and inventory distribution.
          </p>
        </div>
        <Button onClick={handleCreateWarehouse} className="bg-blue-600 text-white hover:bg-blue-700">
          Add New Warehouse
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueCountries()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visible Warehouses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.filter(w => w.isVisible).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
          <CardDescription>
            Manage your warehouse locations and their visibility status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Displayed Name</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Country</th>
                  <th className="text-left py-3 px-4 font-medium">Item Prices</th>
                  <th className="text-left py-3 px-4 font-medium">Visibility</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{warehouse.displayedName}</td>
                    <td className="py-3 px-4">{warehouse.name}</td>
                    <td className="py-3 px-4">{warehouse.countrySlug}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {warehouse._count?.item_price || 0} prices
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(warehouse)}
                          className="h-8 w-8 p-0"
                        >
                          {warehouse.isVisible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ListActionButtons
                        item={warehouse}
                        onEdit={handleEditWarehouse}
                        onDelete={handleDeleteWarehouse}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, warehouses.length)} of {warehouses.length} warehouses
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
      <WarehouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWarehouse}
        warehouse={selectedWarehouse}
      />

      <DeleteWarehouseModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        warehouse={selectedWarehouse}
      />
    </div>
  );
}
