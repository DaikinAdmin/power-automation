'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

interface AskPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  warehouses: Array<{ warehouseId: string; displayedName: string }>;
  formData: {
    warehouseId: string;
    quantity: number;
    comment: string;
  };
  onFormChange: (data: { warehouseId?: string; quantity?: number; comment?: string }) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function AskPriceModal({
  isOpen,
  onClose,
  productName,
  warehouses,
  formData,
  onFormChange,
  onSubmit,
  isSubmitting,
}: AskPriceModalProps) {
  const t = useTranslations('product');
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('askPriceModal.title')}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('askPriceModal.product')}</label>
            <p className="text-sm text-gray-600">{productName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">{t('askPriceModal.selectWarehouse')}</label>
            <select
              value={formData.warehouseId}
              onChange={(e) => onFormChange({ warehouseId: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              <option value="">{t('askPriceModal.selectWarehousePlaceholder')}</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                  {warehouse.displayedName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('askPriceModal.quantity')}</label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => onFormChange({ quantity: parseInt(e.target.value) || 1 })}
              placeholder={t('askPriceModal.quantityPlaceholder')}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('askPriceModal.comments')}</label>
            <Textarea
              value={formData.comment}
              onChange={(e) => onFormChange({ comment: e.target.value })}
              placeholder={t('askPriceModal.commentsPlaceholder')}
              rows={3}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('askPriceModal.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!formData.warehouseId || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? t('askPriceModal.submitting') : t('askPriceModal.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
