'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BasicInformationStep } from '@/components/admin/item-modal/basic-information-step';
import { ItemDetailsStep } from '@/components/admin/item-modal/item-details-step';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Item } from '@/helpers/types/item';
import { useItemFormState } from '@/hooks/useItemFormState';

const initialFormData: Item = {
  id: '',
  articleId: '',
  isDisplayed: false,
  itemImageLink: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  categorySlug: '',
  subCategorySlug: '',
  brandSlug: '',
  brand: null,
  warrantyType: '',
  warrantyLength: null,
  sellCounter: 0,
  category: {
    id: '',
    name: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    slug: '',
    isVisible: true,
    subCategories: [],
    categoryTranslations: []
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
  itemDetails: []
};

export default function NewItemPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const {
    formData,
    setItemFormData,
    resetForm,
    hasChanges
  } = useItemFormState({ initialItem: initialFormData });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/items');
      } else {
        const error = await response.json();
        console.error('Error creating item:', error);
        alert('Error creating item: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating item:', error);
      alert('Error creating item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = () => {
    resetForm();
  };

  const handleGoBack = () => {
    if (hasChanges) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to go back?');
      if (!confirmLeave) return;
    }
    router.push('/admin/items');
  };

  if (!formData) {
    return null;
  }

  return (
    <div className="container mx-auto">
      {/* Header with Close Button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Item</h1>
          <p className="text-sm text-gray-500">Create a new item with pricing and details</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Item Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <BasicInformationStep 
              formData={formData}
              setFormData={setItemFormData}
            />
          </TabsContent>
          
          <TabsContent value="details">
            <ItemDetailsStep 
              formData={formData}
              setFormData={setItemFormData}
            />
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={handleRevert}
            disabled={!hasChanges}
          >
            Revert Changes
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !formData.articleId}
            className="px-8"
          >
            {isLoading ? 'Creating...' : 'Create Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}
