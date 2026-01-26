'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInformationStep, ItemDetailsStep } from './index';
import { Item } from '@/helpers/types/item';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: any) => void;
  item?: Item | null;
}

const initialFormData: Item = {
  id: '',
  articleId: '',
  slug: '',
  alias: null,
  isDisplayed: false,
  itemImageLink: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  categorySlug: '',
  sellCounter: 0,
  category: {
    id: '',
    name: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slug: '',
    isVisible: true,
    subCategories: [],
    categoryTranslations: [],
    imageLink: '',
  },
  subCategory: {
    id: '',
    name: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slug: '',
    isVisible: true,
    categorySlug: '',
  },
  itemPrice: [],
  itemDetails: [],
  linkedItems: [],
  brandSlug: null,
  warrantyLength: 12,
  warrantyType: 'manufacturer',
};

export function ItemModal({ isOpen, onClose, onSave, item }: ItemModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<Item>(initialFormData);
  const [originalFormData, setOriginalFormData] = useState<Item>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      // Populate form with existing item data
      const populatedData: Item = {
        id: item.id,
        articleId: item.articleId,
        slug: item.slug || item.articleId,
        alias: item.alias || null,
        isDisplayed: item.isDisplayed,
        itemImageLink: item.itemImageLink || [],
        categorySlug: item.categorySlug || '',
        category: item.category,
        subCategory: item.subCategory,
        itemPrice: item.itemPrice,
        itemDetails: item.itemDetails,
        linkedItems: item.linkedItems || [],
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(item.createdAt).toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date(item.updatedAt).toISOString(),
        sellCounter: item.sellCounter || 0,
        brandSlug: item.brandSlug || null,
        warrantyLength: item.warrantyLength || 12,
        warrantyType: item.warrantyType || 'manufacturer',
      };
      setFormData(populatedData);
      setOriginalFormData(populatedData);
    } else {
      setFormData(initialFormData);
      setOriginalFormData(initialFormData);
    }
  }, [item, isOpen]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = () => {
    setFormData(originalFormData);
  };

  const handleClose = () => {
    setActiveTab('basic');
    setFormData(initialFormData);
    setOriginalFormData(initialFormData);
    onClose();
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Item Details</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6 space-y-6">
            <BasicInformationStep
              formData={formData}
              setFormData={setFormData}
            />
            
            {/* Footer Buttons for Basic Info Tab */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleRevert}
                disabled={!hasChanges()}
              >
                Revert Changes
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Item'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <ItemDetailsStep
              formData={formData}
              setFormData={setFormData}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}