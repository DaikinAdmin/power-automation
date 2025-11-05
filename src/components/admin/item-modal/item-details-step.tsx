'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { ItemDetailEditModal } from '@/components/admin/item-detail-edit-modal';
import type { Item, ItemDetail } from '@/helpers/types/item';

interface ItemDetailsStepProps {
  formData: Item;
  setFormData: React.Dispatch<React.SetStateAction<Item>>;
}

const locales = [
  { value: 'pl', label: 'Polish (pl)' },
  { value: 'ua', label: 'Ukrainian (ua)' },
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'ru', label: 'Russian (ru)' },
];

export function ItemDetailsStep({ formData, setFormData }: ItemDetailsStepProps) {
  const [selectedLocale, setSelectedLocale] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDetailIndex, setEditingDetailIndex] = useState<number | null>(null);
  const [editingItemDetail, setEditingItemDetail] = useState<ItemDetail | null>(null);

  const [newDetailEntry, setNewDetailEntry] = useState({
    locale: '',
    itemName: '',
    description: '',
    specifications: '',
    seller: '',
    discount: undefined as number | undefined,
  });

  const availableLocales = useMemo(() => {
    const usedLocales = formData.itemDetails.map((detail) => detail.locale);
    return locales.filter((locale) => !usedLocales.includes(locale.value));
  }, [formData.itemDetails]);

  const handleLocaleChange = (value: string) => {
    setSelectedLocale(value);
  };

  const resetNewDetail = () => {
    setSelectedLocale('');
    setNewDetailEntry({
      locale: '',
      itemName: '',
      description: '',
      specifications: '',
      seller: '',
      discount: undefined,
    });
  };

  const addDetailEntry = () => {
    if (!selectedLocale || !newDetailEntry.itemName || !newDetailEntry.description) {
      alert('Please fill in the required fields (Locale, Item Name, Description).');
      return;
    }

    const detailToAdd: ItemDetail = {
      id: `temp-${Date.now()}`,
      itemId: formData.id || '',
      locale: selectedLocale,
      itemName: newDetailEntry.itemName,
      description: newDetailEntry.description,
      specifications: newDetailEntry.specifications || '',
      seller: newDetailEntry.seller || '',
      discount: newDetailEntry.discount ?? null,
      popularity: null,
    } as ItemDetail;

    setFormData((prev) => ({
      ...prev,
      itemDetails: [...prev.itemDetails, detailToAdd],
    }));

    resetNewDetail();
  };

  const removeDetailEntry = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itemDetails: prev.itemDetails.filter((_detail, i) => i !== index),
    }));
  };

  const startEdit = (index: number) => {
    const detail = formData.itemDetails[index];
    setEditingDetailIndex(index);
    setEditingItemDetail(detail);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedDetail = (updatedDetail: ItemDetail) => {
    if (editingDetailIndex === null) return;

    setFormData((prev) => ({
      ...prev,
      itemDetails: prev.itemDetails.map((detail, idx) => (idx === editingDetailIndex ? updatedDetail : detail)),
    }));

    setIsEditModalOpen(false);
    setEditingDetailIndex(null);
    setEditingItemDetail(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDetailIndex(null);
    setEditingItemDetail(null);
  };

  const getLocaleName = (value: string) => locales.find((locale) => locale.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Item Details</h3>
      </div>

      {formData.itemDetails.length > 0 ? (
        <div>
          <h4 className="text-md font-medium mb-3">Current Item Details ({formData.itemDetails.length})</h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Locale</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Item Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Seller</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Discount (%)</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {formData.itemDetails.map((detail, index) => (
                  <tr key={detail.id || `detail-${index}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{getLocaleName(detail.locale)}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{detail.itemName || 'No name'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{detail.seller || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{detail.discount ?? '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(index)}
                          className="text-xs"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeDetailEntry(index)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-50 py-8 text-center text-gray-500">
          No item details found. Add item details to get started.
        </div>
      )}

      {availableLocales.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-3">Add New Item Detail</h4>
          <div className="space-y-4 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Locale *</Label>
                <select
                  value={selectedLocale}
                  onChange={(e) => handleLocaleChange(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Locale</option>
                  {availableLocales.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Item Name *</Label>
                <Input
                  value={newDetailEntry.itemName}
                  onChange={(e) => setNewDetailEntry((prev) => ({ ...prev, itemName: e.target.value }))}
                  className="mt-1"
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <Label>Seller</Label>
                <Input
                  value={newDetailEntry.seller}
                  onChange={(e) => setNewDetailEntry((prev) => ({ ...prev, seller: e.target.value }))}
                  className="mt-1"
                  placeholder="Enter seller name"
                />
              </div>

              <div>
                <Label>Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newDetailEntry.discount ?? ''}
                  onChange={(e) =>
                    setNewDetailEntry((prev) => ({
                      ...prev,
                      discount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="mt-1"
                  placeholder="Enter discount percentage"
                />
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <textarea
                value={newDetailEntry.description}
                onChange={(e) => setNewDetailEntry((prev) => ({ ...prev, description: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter description"
              />
            </div>

            <div>
              <Label>Specifications</Label>
              <textarea
                value={newDetailEntry.specifications}
                onChange={(e) => setNewDetailEntry((prev) => ({ ...prev, specifications: e.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter specifications (optional)"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={resetNewDetail}>
                Reset
              </Button>
              <Button type="button" onClick={addDetailEntry}>
                <Plus className="mr-2 h-4 w-4" /> Add Item Detail
              </Button>
            </div>
          </div>
        </div>
      )}

      <ItemDetailEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        itemDetail={editingItemDetail || formData.itemDetails[editingDetailIndex ?? 0]}
        onSave={handleSaveEditedDetail}
      />
    </div>
  );
}
