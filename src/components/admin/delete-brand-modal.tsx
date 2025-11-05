'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Brand } from '@prisma/client';

interface DeleteBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (brand: Brand) => void;
  brand: Brand | null;
}

export function DeleteBrandModal({ isOpen, onClose, onConfirm, brand }: DeleteBrandModalProps) {
  if (!brand) return null;

  const handleConfirm = () => {
    onConfirm(brand);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Brand</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the brand "{brand.name}"? This action cannot be undone.
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
