'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Brand } from '@/db/schema';

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
          <DialogTitle>{brand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          <DialogDescription>
            {brand
              ? 'Update brand details and visibility preferences.'
              : 'Provide information to register a new brand.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-name" className="text-right">
                Name
              </Label>
              <Input
                id="brand-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                className="col-span-3"
                placeholder="Brand name"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-alias" className="text-right">
                Alias
              </Label>
              <Input
                id="brand-alias"
                value={formState.alias}
                onChange={(event) => setFormState((prev) => ({ ...prev, alias: event.target.value }))}
                className="col-span-3"
                placeholder="Unique alias"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-image" className="text-right">
                Image URL
              </Label>
              <Input
                id="brand-image"
                value={formState.imageLink}
                onChange={(event) => setFormState((prev) => ({ ...prev, imageLink: event.target.value }))}
                className="col-span-3"
                placeholder="https://example.com/brand.png"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-created" className="text-right">
                Created At
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
              <Label className="text-right">Updated At</Label>
              <Input
                value={toDateTimeLocalValue(brand?.updatedAt ?? new Date())}
                readOnly
                className="col-span-3 bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand-visible" className="text-right">
                Visible
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
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving…' : brand ? 'Update Brand' : 'Create Brand'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
