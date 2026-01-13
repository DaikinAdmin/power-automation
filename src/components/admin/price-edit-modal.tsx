'use client';

import { useState, useEffect } from 'react';
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
import { ItemPrice } from '@/helpers/types/item';
import type { Warehouse, Badge } from '@/db/schema';

interface PriceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceEntry: ItemPrice;
  onSave: (updatedPriceEntry: ItemPrice) => void;
}

export function PriceEditModal({ isOpen, onClose, priceEntry, onSave }: PriceEditModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState<ItemPrice>({
    id: '',
    itemSlug: '',
    warehouseId: '',
    price: 0,
    quantity: 0,
    promotionPrice: null,
    promoEndDate: null,
    promoCode: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    badge: "ABSENT",
    history: [],
    warehouse: {
      id: '',
      name: '',
      displayedName: '',
      isVisible: true,
      countrySlug: 'other',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (priceEntry && isOpen) {
      setFormData({
        ...priceEntry,
        badge: priceEntry.badge || "ABSENT",
      });
    }
  }, [priceEntry, isOpen]);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/admin/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const handleSave = () => {
    if (!formData.warehouseId || formData.price <= 0 || formData.quantity < 0) {
      alert('Please fill in all required fields');
      return;
    }

    const warehouse = warehouses.find(w => w.id === formData.warehouseId);
    
    const updatedPriceEntry = {
      ...formData,
      warehouse: warehouse || formData.warehouse
    };

    onSave(updatedPriceEntry);
    onClose();
  };

  const handleCancel = () => {
    setFormData(priceEntry);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Price Details</DialogTitle>
          <DialogDescription>
            Update the pricing information for this item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warehouse *</Label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, warehouseId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.displayedName || warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Price *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="mt-1"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="mt-1"
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label>Promotion Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.promotionPrice || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, promotionPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                className="mt-1"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Badge</Label>
              <select
                value={formData.badge || "ABSENT"}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, badge: e.target.value as Badge }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
              >
                {badgeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Promo Code</Label>
              <Input
                value={formData.promoCode || ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, promoCode: e.target.value }))}
                className="mt-1"
                placeholder="Enter promo code"
              />
            </div>

            <div>
              <Label>Promo End Date</Label>
              <Input
                type="date"
                value={formData.promoEndDate ? new Date(formData.promoEndDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, promoEndDate: e.target.value ? new Date(e.target.value) : null }))}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
  const badgeOptions = [
    { value: "ABSENT", label: 'None' },
    { value: "NEW_ARRIVALS", label: 'New Arrivals' },
    { value: "BESTSELLER", label: 'Bestseller' },
    { value: "HOT_DEALS", label: 'Hot Deals' },
    { value: "LIMITED_EDITION", label: 'Limited Edition' },
  ];
