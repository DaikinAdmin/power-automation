'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('adminDashboard');

  if (!warehouse) return null;

  const handleConfirm = () => {
    onConfirm(warehouse);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('warehouses.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('warehouses.delete.description', { name: warehouse.name ?? '', country: warehouse.countrySlug ?? '' })}
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
