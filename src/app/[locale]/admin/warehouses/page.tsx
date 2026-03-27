'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WarehouseModal } from '@/components/admin/warehouse-modal';
import { DeleteWarehouseModal } from '@/components/admin/delete-warehouse-modal';
import { Eye, EyeOff, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Warehouse as Warehouses, WarehouseCountries } from '@/db/schema';
import { usePagination } from '@/hooks/usePagination';
import { useAdminWarehouses } from '@/hooks/useAdminWarehouses';
import { ListActionButtons } from '@/components/admin/list-action-buttons';
import { toast } from 'sonner';
import Link from 'next/link';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const t = useTranslations('adminDashboard');

  // Fetch warehouses using custom hook
  const { warehouses, isLoading, refetch: refetchWarehouses } = useAdminWarehouses();

  // Warehouse countries state
  const [countries, setCountries] = useState<WarehouseCountries[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);
  const [editVat, setEditVat] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setIsCountriesLoading(true);
      const res = await fetch('/api/admin/warehouse-countries');
      if (res.ok) {
        const data: WarehouseCountries[] = await res.json();
        setCountries(data);
        const vat: Record<number, string> = {};
        data.forEach((c) => {
          vat[c.id] = c.vatPercentage !== null && c.vatPercentage !== undefined
            ? String(c.vatPercentage)
            : '';
        });
        setEditVat(vat);
      }
    } finally {
      setIsCountriesLoading(false);
    }
  };

  const handleSaveVat = async (country: WarehouseCountries) => {
    const raw = editVat[country.id];
    const parsed = raw === '' ? null : parseFloat(raw);
    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) {
      toast.error(t('warehouses.vat.vatError'));
      return;
    }
    setSavingId(country.id);
    try {
      const res = await fetch(`/api/admin/warehouse-countries/${country.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vatPercentage: parsed }),
      });
      if (res.ok) {
        toast.success(`VAT for ${country.name} updated`);
        await fetchCountries();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update VAT');
      }
    } catch {
      toast.error('Unexpected error');
    } finally {
      setSavingId(null);
    }
  };

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    currentItems: currentWarehouses,
    goToNextPage,
    goToPreviousPage,
    pageSize
  } = usePagination<Warehouse>({ data: warehouses as Warehouse[], pageSize: 5 });

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
          await refetchWarehouses();
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
          await refetchWarehouses();
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
        await refetchWarehouses();
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
        await refetchWarehouses();
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
          <h1 className="text-3xl font-bold tracking-tight">{t('warehouses.title')}</h1>
          <p className="text-gray-600">
            {t('warehouses.description')}
          </p>
        </div>
        <Button onClick={handleCreateWarehouse} className="bg-blue-600 text-white hover:bg-blue-700">
          {t('warehouses.addNew')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('warehouses.stats.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('warehouses.stats.countries')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUniqueCountries()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('warehouses.stats.visible')}</CardTitle>
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
          <CardTitle>{t('warehouses.table.header')}</CardTitle>
          <CardDescription>
            {t('warehouses.table.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.displayedName')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.name')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.country')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.itemPrices')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.visibility')}</th>
                  <th className="text-left py-3 px-4 font-medium">{t('warehouses.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentWarehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{warehouse.displayedName}</td>
                    <td className="py-3 px-4">{warehouse.name}</td>
                    <td className="py-3 px-4">{warehouse.countrySlug}</td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/warehouses/${warehouse.id}`}>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200 duration-300">
                          {t('warehouses.table.prices', { count: warehouse._count?.item_price || 0 })}
                        </span>
                      </Link>
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
                {t('warehouses.table.showing', { from: (currentPage - 1) * pageSize + 1, to: Math.min(currentPage * pageSize, warehouses.length), total: warehouses.length })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <span className="text-sm">
                  {t('warehouses.table.pageOf', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warehouse Countries VAT */}
      <Card>
        <CardHeader>
          <CardTitle>{t('warehouses.vat.header')}</CardTitle>
          <CardDescription>
            {t('warehouses.vat.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCountriesLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">{t('warehouses.vat.country')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('warehouses.vat.slug')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('warehouses.vat.code')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('warehouses.vat.vatPct')}</th>
                    <th className="text-left py-3 px-4 font-medium">{t('warehouses.vat.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) => (
                    <tr key={country.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{country.name}</td>
                      <td className="py-3 px-4 text-gray-500">{country.slug}</td>
                      <td className="py-3 px-4 text-gray-500">{country.countryCode}</td>
                      <td className="py-3 px-4 w-36">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={editVat[country.id] ?? ''}
                          onChange={(e) =>
                            setEditVat((prev) => ({ ...prev, [country.id]: e.target.value }))
                          }
                          placeholder="e.g. 23"
                          className="h-8 w-28"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          onClick={() => handleSaveVat(country)}
                          disabled={savingId === country.id}
                          className="h-8"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          {t('warehouses.vat.save')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
