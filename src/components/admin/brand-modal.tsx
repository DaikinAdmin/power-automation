'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Brand } from '@/db/schema';
import { ImagePickerModal } from '@/components/admin/image-picker-modal';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brand: Partial<Brand> & Pick<Brand, 'name' | 'alias' | 'imageLink'>) => Promise<void> | void;
  brand?: Brand | null;
}

const toDateTimeLocalValue = (date: Date | string | null | undefined) => {
  if (!date) return new Date().toISOString().slice(0, 16);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 16);
  }
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function BrandModal({ isOpen, onClose, onSave, brand }: BrandModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('adminDashboard.brands');
  const [formState, setFormState] = useState({
    name: brand?.name ?? '',
    alias: brand?.alias ?? '',
    imageLink: brand?.imageLink ?? '',
    isVisible: brand?.isVisible ?? true,
    createdAt: toDateTimeLocalValue(brand?.createdAt ?? new Date()),
  });

  useEffect(() => {
    setFormState({
      name: brand?.name ?? '',
      alias: brand?.alias ?? '',
      imageLink: brand?.imageLink ?? '',
      isVisible: brand?.isVisible ?? true,
      createdAt: toDateTimeLocalValue(brand?.createdAt ?? new Date()),
    });
  }, [brand, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await onSave({
        ...(brand ? { id: brand.id } : {}),
        name: formState.name,
        alias: formState.alias,
        imageLink: formState.imageLink,
        isVisible: formState.isVisible,
        createdAt: new Date(formState.createdAt),
      } as unknown as Partial<Brand> & Pick<Brand, 'name' | 'alias' | 'imageLink'>);
      onClose();
    } catch (error) {
      console.error('Error saving brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{brand ? t('modal.editTitle') : t('modal.addTitle')}</DialogTitle>
          <DialogDescription>
            {brand ? t('modal.editDesc') : t('modal.addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-name" className="text-right">
                {t('modal.name')}
              </Label>
              <Input
                id="brand-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="col-span-3"
                placeholder={t('modal.namePlaceholder')}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-alias" className="text-right">
                {t('modal.alias')}
              </Label>
              <Input
                id="brand-alias"
                value={formState.alias}
                onChange={(event) => setFormState((prev) => ({ ...prev, alias: event.target.value }))}
                className="col-span-3"
                placeholder={t('modal.aliasPlaceholder')}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="brand-image" className="text-right mt-2">
                {t('modal.imageUrl')}
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="brand-image"
                    value={formState.imageLink}
                    onChange={(event) => setFormState((prev) => ({ ...prev, imageLink: event.target.value }))}
                    placeholder={t('modal.imagePlaceholder')}
                    required
                  />
                  <ImagePickerModal
                    label={t('modal.library')}
                    onSelect={(url) => setFormState((prev) => ({ ...prev, imageLink: url }))}
                  />
                </div>
                {formState.imageLink && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formState.imageLink} alt="preview" className="h-12 w-12 object-cover rounded border" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-created" className="text-right">
                {t('modal.createdAt')}
              </Label>
              <Input
                id="brand-created"
                type="datetime-local"
                value={formState.createdAt}
                onChange={(event) => setFormState((prev) => ({ ...prev, createdAt: event.target.value }))}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">{t('modal.updatedAt')}</Label>
              <Input
                value={toDateTimeLocalValue(brand?.updatedAt ?? new Date())}
                readOnly
                className="col-span-3 bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-visible" className="text-right">
                {t('modal.visible')}
              </Label>
              <div className="col-span-3">
                <Switch
                  id="brand-visible"
                  checked={formState.isVisible}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isVisible: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('modal.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('modal.saving') : brand ? t('modal.updateBtn') : t('modal.createBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
