'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Warehouse } from '@/db/schema';

interface DeleteWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (warehouse: Warehouse) => void;
  warehouse: Warehouse | null;
}

export function DeleteWarehouseModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  warehouse 
}: DeleteWarehouseModalProps) {
  if (!warehouse) return null;

  const handleConfirm = () => {
    onConfirm(warehouse);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Warehouse</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the warehouse "{warehouse.name}" in {warehouse.countrySlug}? 
            This action cannot be undone and will affect all associated items and prices.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
