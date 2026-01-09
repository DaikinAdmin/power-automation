'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item } from '@/helpers/types/item';


interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: Item) => Promise<void>;
  item: Item | null;
}

export function DeleteItemModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item 
}: DeleteItemModalProps) {
  if (!item) return null;

  const handleConfirm = async () => {
    await onConfirm(item);
    onClose();
  };

  const itemName = item.itemDetails?.[0]?.itemName || 'Unnamed Item';
  const brandName = item.brand?.name || item.brandSlug || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the item "{itemName}" {brandName ? `by ${brandName}` : ''} 
            (Article ID: {item.articleId})? This action cannot be undone and will remove all associated 
            data including prices, details, and related records.
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
