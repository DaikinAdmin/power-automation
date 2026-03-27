'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('adminDashboard');

  if (!item) return null;

  const itemName = item.itemDetails?.[0]?.itemName || 'Unnamed Item';
  const brandName = item.brand?.name || item.brandSlug || '';

  const handleConfirm = async () => {
    await onConfirm(item);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('items.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('items.delete.description', { name: itemName, articleId: item.articleId })}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            {t('common.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
