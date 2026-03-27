'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/db/schema';

interface DeleteBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (brand: Brand) => void;
  brand: Brand | null;
}

export function DeleteBrandModal({ isOpen, onClose, onConfirm, brand }: DeleteBrandModalProps) {
  const t = useTranslations('adminDashboard');
  if (!brand) return null;

  const handleConfirm = () => {
    onConfirm(brand);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('brands.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('brands.delete.description', { name: brand.name })}
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
