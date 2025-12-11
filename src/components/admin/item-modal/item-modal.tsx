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
  isDisplayed: false,
  itemImageLink: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  categorySlug: '',
  subCategorySlug: '',
  sellCounter: 0,
  category: {
    id: '',
    name: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    slug: '',
    isVisible: true,
    subCategories: []
  },
  subCategory: {
    id: '',
    name: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    slug: '',
    isVisible: true,
    categorySlug: ''
  },
  itemPrice: [],
  itemDetails: [],
  brandId: '',
  brandName: '',
  warrantyLength: null,
  warrantyType: '',
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
        isDisplayed: item.isDisplayed,
        itemImageLink: item.itemImageLink || '',
        categorySlug: item.categorySlug || '',
        subCategorySlug: item.subCategorySlug || '',
        category: item.category,
        subCategory: item.subCategory,
        itemPrice: item.itemPrice,
        itemDetails: item.itemDetails,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        sellCounter: item.sellCounter || 0,
        brandId: item.brandId || '',
        brandName: item.brandName || '',
        warrantyLength: item.warrantyLength || null,
        warrantyType: item.warrantyType || '',
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