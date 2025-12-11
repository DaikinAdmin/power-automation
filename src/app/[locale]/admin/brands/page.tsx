'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandModal } from '@/components/admin/brand-modal';
import { DeleteBrandModal } from '@/components/admin/delete-brand-modal';
import { ListActionButtons } from '@/components/admin/list-action-buttons';
import { usePagination } from '@/hooks/usePagination';
import { Eye, EyeOff, ImageIcon } from 'lucide-react';
import type { Brand as BrandType } from '@prisma/client';

interface Brand extends BrandType {
  id: string;
  isVisible: boolean;
  imageLink: any;
  name: string;
  alias: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    items: number;
  };
}

const formatDate = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const {
    currentPage,
    currentItems,
    goToNextPage,
    goToPreviousPage,
    totalPages,
  } = usePagination<Brand>({ data: brands, pageSize: 5 });

  useEffect(() => {
    void fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/brands');
      if (!response.ok) {
        console.error('Failed to fetch brands');
        return;
      }
      const data = await response.json();
      setBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBrand = () => {
    setSelectedBrand(null);
    setIsModalOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsModalOpen(true);
  };

  const handleDeleteBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsDeleteModalOpen(true);
  };

  const handleToggleVisibility = async (brand: Brand) => {
    try {
      const { _count, updatedAt: _updatedAt, ...brandData } = brand;
      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...brandData,
          isVisible: !brand.isVisible,
        }),
      });

      if (!response.ok) {
        console.error('Failed to toggle brand visibility');
        return;
      }

      await fetchBrands();
    } catch (error) {
      console.error('Error toggling brand visibility:', error);
    }
  };

  const handleSaveBrand = async (
    brandData: Partial<BrandType> & Pick<BrandType, 'name' | 'alias' | 'imageLink'>
  ) => {
    try {
      if (selectedBrand) {
        const { _count, updatedAt: _updatedAt, ...existing } = selectedBrand;
        const response = await fetch(`/api/admin/brands/${selectedBrand.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...existing,
            ...brandData,
            createdAt: brandData.createdAt,
          }),
        });

        if (!response.ok) {
          console.error('Failed to update brand');
          return;
        }
      } else {
        const response = await fetch('/api/admin/brands', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...brandData,
          }),
        });

        if (!response.ok) {
          console.error('Failed to create brand');
          return;
        }
      }

      await fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
    }
  };

  const handleConfirmDelete = async (brand: Brand) => {
    try {
      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete brand');
        return;
      }

      await fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
    }
  };

  const stats = useMemo(() => {
    const total = brands.length;
    const visible = brands.filter((brand) => brand.isVisible).length;
    const hidden = total - visible;
    const connectedItems = brands.reduce((sum, brand) => sum + (brand._count?.items ?? 0), 0);

    return {
      total,
      visible,
      hidden,
      connectedItems,
    };
  }, [brands]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Management</h1>
          <p className="text-gray-600">Maintain the catalog of brands available across the marketplace.</p>
        </div>
        <Button onClick={handleCreateBrand} className="bg-blue-600 text-white hover:bg-blue-700">
          Add New Brand
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Total Brands</CardTitle>
            <CardDescription>Registered across all locales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Visible Brands</CardTitle>
            <CardDescription>Currently displayed to customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.visible}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Hidden Brands</CardTitle>
            <CardDescription>Available for later activation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hidden}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-sm font-medium">Linked Items</CardTitle>
            <CardDescription>Total items associated with brands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connectedItems}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Brands</h2>
        </div>
        <div className="divide-y">
          {currentItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No brands found. Create your first brand to get started.
            </div>
          ) : (
            currentItems.map((brand) => (
              <div key={brand.id} className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded bg-gray-100">
                    {brand.imageLink ? (
                      <img
                        src={brand.imageLink}
                        alt={brand.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{brand.name}</h3>
                      <Badge variant={brand.isVisible ? 'default' : 'outline'}>
                        {brand.isVisible ? 'Visible' : 'Hidden'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">Alias: {brand.alias}</p>
                    <p className="text-xs text-gray-400">
                      Created {formatDate(brand.createdAt)} · Updated {formatDate(brand.updatedAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Linked items: {brand._count?.items ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleVisibility(brand)}
                    className="h-8 w-8 p-0"
                  >
                    {brand.isVisible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-500" />}
                  </Button>
                  <ListActionButtons
                    item={brand}
                    onEdit={handleEditBrand}
                    onDelete={handleDeleteBrand}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3 text-sm text-gray-600">
            <Button variant="ghost" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>

      <BrandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBrand}
        brand={selectedBrand}
      />

      <DeleteBrandModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        brand={selectedBrand}
      />
    </div>
  );
}
