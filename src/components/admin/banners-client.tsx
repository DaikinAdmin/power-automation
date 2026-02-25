'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BannerModal } from '@/components/admin/banner-modal';
import { DeleteBannerModal } from '@/components/admin/delete-banner-modal';
import { Eye, EyeOff, Plus, GripVertical, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface Banner {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  device: string;
  locale: string;
  sortOrder: number | null;
  isActive: boolean | null;
  updatedAt: Date | null;
}

const POSITIONS = [
  { value: 'home_top', label: 'Home - Top' },
  { value: 'home_middle', label: 'Home - Middle' },
  { value: 'home_bottom', label: 'Home - Bottom' },
  { value: 'catalog_sidebar', label: 'Catalog - Sidebar' },
  { value: 'catalog_top', label: 'Catalog - Top' },
  { value: 'promo', label: 'Promo Section' },
  { value: 'category_top', label: 'Category - Top' },
];

const DEVICES = [
  { value: 'ultrawide', label: 'Ultrawide' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'mobile', label: 'Mobile' },
];

const LOCALES = [
  { value: 'pl', label: '🇵🇱 Polski' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'ua', label: '🇺🇦 Українська' },
];

function SortableBannerItem({ 
  banner, 
  onEdit, 
  onDelete, 
  onToggleVisibility,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
}: {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
  onToggleVisibility: (banner: Banner) => void;
  onDragStart: (e: React.DragEvent, banner: Banner) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, banner: Banner) => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, banner)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, banner)}
      className={`flex items-center gap-4 rounded-lg border bg-white p-4 transition-all ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-blue-500' : 'shadow-sm hover:shadow-md'
      }`}
    >
      {/* Drag Handle */}
      <div
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Banner Preview */}
      <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded border bg-gray-100">
        <Image
          src={banner.imageUrl}
          alt={banner.title || 'Banner'}
          fill
          className="object-cover"
          sizes="112px"
        />
      </div>

      {/* Banner Info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">
            {banner.title || 'Untitled Banner'}
          </h3>
          {!banner.isActive && (
            <Badge variant="secondary" className="bg-gray-200 text-gray-600">
              Hidden
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
            Order: {banner.sortOrder ?? 0}
          </span>
          {banner.linkUrl && (
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate max-w-xs">{banner.linkUrl}</span>
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(banner)}
          className="text-gray-600 hover:text-gray-900"
        >
          {banner.isActive ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(banner)}
          className="text-blue-600 hover:text-blue-700"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(banner)}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BannersClient() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState('home_top');
  const [device, setDevice] = useState('desktop');
  const [locale, setLocale] = useState('pl');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [draggedBanner, setDraggedBanner] = useState<Banner | null>(null);

  useEffect(() => {
    void fetchBanners();
  }, [position, device, locale]);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ position, device, locale });
      const response = await fetch(`/api/admin/banners?${params}`);
      
      if (!response.ok) {
        console.error('Failed to fetch banners');
        return;
      }
      
      const data = await response.json();
      setBanners(data.sort((a: Banner, b: Banner) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, banner: Banner) => {
    setDraggedBanner(banner);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBanner(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetBanner: Banner) => {
    e.preventDefault();
    
    if (!draggedBanner || draggedBanner.id === targetBanner.id) {
      setDraggedBanner(null);
      return;
    }

    const oldIndex = banners.findIndex((b) => b.id === draggedBanner.id);
    const newIndex = banners.findIndex((b) => b.id === targetBanner.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder banners array
    const reorderedBanners = [...banners];
    const [removed] = reorderedBanners.splice(oldIndex, 1);
    reorderedBanners.splice(newIndex, 0, removed);
    
    // Update sortOrder for all banners
    const updatedBanners = reorderedBanners.map((banner, index) => ({
      ...banner,
      sortOrder: index,
    }));

    setBanners(updatedBanners);
    setDraggedBanner(null);

    // Save new order to backend
    try {
      await Promise.all(
        updatedBanners.map((banner) =>
          fetch(`/api/admin/banners/${banner.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: banner.sortOrder }),
          })
        )
      );
    } catch (error) {
      console.error('Error updating banner order:', error);
      // Revert on error
      await fetchBanners();
    }
  };

  const handleCreateBanner = () => {
    setSelectedBanner(null);
    setIsModalOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    setIsModalOpen(true);
  };

  const handleDeleteBanner = (banner: Banner) => {
    setSelectedBanner(banner);
    setIsDeleteModalOpen(true);
  };

  const handleToggleVisibility = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });

      if (!response.ok) {
        console.error('Failed to toggle banner visibility');
        return;
      }

      await fetchBanners();
    } catch (error) {
      console.error('Error toggling banner visibility:', error);
    }
  };

  const handleSaveBanner = async (bannerData: Partial<Banner>) => {
    try {
      if (selectedBanner) {
        const response = await fetch(`/api/admin/banners/${selectedBanner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bannerData),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to update banner');
          return;
        }
      } else {
        const response = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bannerData,
            position,
            device,
            locale,
            sortOrder: banners.length,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          alert(error.error || 'Failed to create banner');
          return;
        }
      }

      await fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleConfirmDelete = async (banner: Banner) => {
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete banner');
        return;
      }

      await fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const activeBanners = banners.filter((b) => b.isActive);
  const inactiveBanners = banners.filter((b) => !b.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banner Management</h1>
          <p className="text-gray-600">Manage promotional banners across different pages and devices</p>
        </div>
        <Button onClick={handleCreateBanner} className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add New Banner
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Position</label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Device</label>
              <Select value={device} onValueChange={setDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICES.map((dev) => (
                    <SelectItem key={dev.value} value={dev.value}>
                      {dev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Locale</label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((loc) => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{banners.length}</div>
              <div className="text-sm text-gray-600">Total Banners</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{activeBanners.length}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">{inactiveBanners.length}</div>
              <div className="text-sm text-gray-600">Hidden</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banners List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Banners for {POSITIONS.find(p => p.value === position)?.label} - {DEVICES.find(d => d.value === device)?.label} - {LOCALES.find(l => l.value === locale)?.label}
            </CardTitle>
            {banners.length > 0 && (
              <Badge variant="outline" className="text-xs">
                Drag to reorder
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <Plus className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600 mb-4">No banners found for this configuration</p>
              <Button onClick={handleCreateBanner} variant="outline">
                Create First Banner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {banners.map((banner) => (
                <SortableBannerItem
                  key={banner.id}
                  banner={banner}
                  onEdit={handleEditBanner}
                  onDelete={handleDeleteBanner}
                  onToggleVisibility={handleToggleVisibility}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragging={draggedBanner?.id === banner.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <BannerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBanner(null);
        }}
        onSave={handleSaveBanner}
        banner={selectedBanner}
        currentPosition={position}
        currentDevice={device}
        currentLocale={locale}
      />

      <DeleteBannerModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedBanner(null);
        }}
        onConfirm={() => {
          if (selectedBanner) {
            void handleConfirmDelete(selectedBanner);
          }
          setIsDeleteModalOpen(false);
          setSelectedBanner(null);
        }}
        banner={selectedBanner}
      />
    </div>
  );
}
