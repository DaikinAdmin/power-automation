'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  item?: any;
}

export function ItemModal({ isOpen, onClose, onSave, item }: ItemModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Create Item'}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>Item modal functionality will be implemented here.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
