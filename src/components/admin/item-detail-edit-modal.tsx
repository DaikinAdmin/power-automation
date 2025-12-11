'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ItemDetail } from '@/helpers/types/item';

const locales = [
  { value: 'pl', label: 'Polish (pl)' },
  { value: 'ua', label: 'Ukrainian (ua)' },
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Spanish (es)' },
];

interface ItemDetailEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDetail: ItemDetail;
  onSave: (updatedItemDetail: ItemDetail) => void;
}

export function ItemDetailEditModal({ isOpen, onClose, itemDetail, onSave }: ItemDetailEditModalProps) {
  const [formData, setFormData] = useState<ItemDetail>(itemDetail);

  useEffect(() => {
    setFormData(itemDetail);
  }, [itemDetail]);

  const handleInputChange = (field: keyof ItemDetail, value: string | number | undefined | null) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.locale) {
      alert('Please select a locale');
      return;
    }

    if (!formData.itemName?.trim()) {
      alert('Please enter an item name');
      return;
    }

    if (!formData.description?.trim()) {
      alert('Please enter a description');
      return;
    }

    onSave({
      ...formData,
      discount: formData.discount ?? null,
      specifications: formData.specifications || '',
      seller: formData.seller || '',
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData(itemDetail);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item Details</DialogTitle>
          <DialogDescription>Update the item details information for this locale.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="locale">Locale *</Label>
            <select
              id="locale"
              value={formData.locale}
              onChange={(e) => handleInputChange('locale', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a locale</option>
              {locales.map((locale) => (
                <option key={locale.value} value={locale.value}>
                  {locale.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name *</Label>
            <Input
              id="itemName"
              value={formData.itemName || ''}
              onChange={(e) => handleInputChange('itemName', e.target.value)}
              placeholder="Enter item name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seller">Seller</Label>
            <Input
              id="seller"
              value={formData.seller || ''}
              onChange={(e) => handleInputChange('seller', e.target.value)}
              placeholder="Enter seller name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              value={formData.discount ?? ''}
              onChange={(e) => handleInputChange('discount', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Enter discount percentage"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter item description"
              rows={4}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="specifications">Specifications</Label>
            <textarea
              id="specifications"
              value={formData.specifications || ''}
              onChange={(e) => handleInputChange('specifications', e.target.value)}
              placeholder="Enter item specifications"
              rows={3}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
