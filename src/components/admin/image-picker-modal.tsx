'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Search, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface UploadedImage {
  id: string;
  fileName: string;
  originalName: string;
  path: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ImagePickerModalProps {
  /** Called with the selected image URL when user confirms a choice */
  onSelect: (url: string) => void;
  /** Trigger element — rendered as-is; the modal open state is controlled internally */
  trigger?: React.ReactNode;
  /** Optional: control open state from outside */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Label for the trigger button when trigger is not provided */
  label?: string;
}

export function ImagePickerModal({
  onSelect,
  trigger,
  open: controlledOpen,
  onOpenChange,
  label,
}: ImagePickerModalProps) {
  const t = useTranslations('adminDashboard');
  const resolvedLabel = label ?? t('imagePicker.label');
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
    if (controlledOpen === undefined) setInternalOpen(value);
  };

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const fetchImages = useCallback(async (page: number, searchQuery: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '24' });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/uploads?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images ?? []);
      setPagination(data.pagination ?? { page, limit: 24, total: 0, totalPages: 0 });
    } catch (e) {
      console.error('ImagePickerModal fetch error', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when modal opens or page/search changes
  useEffect(() => {
    if (isOpen) {
      fetchImages(pagination.page, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(1, search);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    fetchImages(newPage, search);
    setPagination((p) => ({ ...p, page: newPage }));
  };

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      setOpen(false);
      setSelectedUrl(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUrl(null);
  };

  return (
    <>
      {/* Trigger */}
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ImageIcon className="w-4 h-4 mr-2" />
          {resolvedLabel}
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('imagePicker.dialogTitle')}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 shrink-0">
            <Input
              placeholder={t('imagePicker.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <ImageIcon className="w-12 h-12 mb-2 opacity-40" />
                <p className="text-sm">{t('imagePicker.empty')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 p-1">
                {images.map((img) => {
                  const isSelected = selectedUrl === img.url;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedUrl(img.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-300'
                          : 'border-transparent hover:border-blue-300'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.originalName || img.fileName}
                        fill
                        className="object-cover"
                        sizes="120px"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            '/imgs/placeholder.webp';
                        }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                          <div className="bg-blue-600 text-white rounded-full p-0.5">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between shrink-0 pt-2 border-t text-sm text-gray-600">
              <span>
                {t('imagePicker.paginationInfo', { total: pagination.total, current: pagination.page, totalPages: pagination.totalPages })}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-between items-center shrink-0 pt-2 border-t">
            {selectedUrl ? (
              <p className="text-xs text-gray-500 truncate max-w-[60%]">{selectedUrl}</p>
            ) : (
              <p className="text-xs text-gray-400">{t('imagePicker.selectPrompt')}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('imagePicker.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!selectedUrl}
                onClick={handleConfirm}
              >
                {t('imagePicker.select')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
