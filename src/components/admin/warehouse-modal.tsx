'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Warehouse } from '@/db/schema';

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (warehouse: Omit<Warehouse, 'id'> | Warehouse) => void;
  warehouse?: Warehouse | null;
}

export function WarehouseModal({ isOpen, onClose, onSave, warehouse }: WarehouseModalProps) {
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    countrySlug: warehouse?.countrySlug || 'other',
    displayedName: warehouse?.displayedName || '',
    isVisible: warehouse?.isVisible ?? true,
    createdAt: warehouse?.createdAt || new Date(),
    updatedAt: warehouse?.updatedAt || new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const countryOptions = [
    { value: 'ua', label: 'Ukraine' },
    { value: 'es', label: 'Spain' },
    { value: 'pl', label: 'Poland' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (warehouse) {
        // Edit existing warehouse
        onSave({ 
          ...warehouse, 
          ...formData,
          createdAt: formData.createdAt instanceof Date ? formData.createdAt.toISOString() : formData.createdAt,
          updatedAt: formData.updatedAt instanceof Date ? formData.updatedAt.toISOString() : formData.updatedAt,
        });
      } else {
        // Create new warehouse
        onSave({
          ...formData,
          createdAt: formData.createdAt instanceof Date ? formData.createdAt.toISOString() : formData.createdAt,
          updatedAt: formData.updatedAt instanceof Date ? formData.updatedAt.toISOString() : formData.updatedAt,
        });
      }
      
      // Reset form
      setFormData({
        name: '',
        countrySlug: 'other',
        displayedName: '',
        isVisible: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Error saving warehouse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // setFormData({
    //   name: warehouse?.name || '',
    //   country: warehouse?.country || 'Other',
    //   displayedName: warehouse?.displayedName || '',
    //   isVisible: warehouse?.isVisible ?? true,
    //   createdAt: warehouse?.createdAt || new Date(),
    //   updatedAt: warehouse?.updatedAt || new Date(),
    // });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {warehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
          </DialogTitle>
          <DialogDescription>
            {warehouse 
              ? 'Update the warehouse information below.' 
              : 'Fill in the warehouse information below.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="displayedName" className="text-right">
                Displayed Name
              </Label>
              <Input
                id="displayedName"
                value={formData.displayedName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayedName: e.target.value }))}
                className="col-span-3"
                placeholder="Warehouse name to Display"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="Warehouse name"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="countrySlug" className="text-right">
                Country
              </Label>
              <select
                id="countrySlug"
                value={formData.countrySlug}
                onChange={(e) => setFormData(prev => ({ ...prev, countrySlug: e.target.value }))}
                className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visible" className="text-right">
                Visible
              </Label>
              <div className="col-span-3">
                <Switch
                  id="visible"
                  checked={formData.isVisible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVisible: checked }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : warehouse ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
