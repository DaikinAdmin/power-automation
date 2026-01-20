'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { BasicInformationStep } from '@/components/admin/item-modal/basic-information-step';
import { ItemDetailsStep } from '@/components/admin/item-modal/item-details-step';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Item } from '@/helpers/types/item';
import { useItemFormState } from '@/hooks/useItemFormState';

export default function EditItemPage({ params }: { params: Promise<{ articleId: string }> }) {
  const router = useRouter();
  const { articleId } = use(params);
  const itemId = articleId as string;
  
  const [activeTab, setActiveTab] = useState('basic');
  const {
    formData,
    setItemFormData,
    setInitialData,
    hasChanges
  } = useItemFormState({ initialItem: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/items/${itemId}`);
      if (response.ok) {
        const item = await response.json();
        
        // Convert item data to FormData format - ensure proper mapping
        const itemFormData: Item = {
          id: item.id || '',
          slug: item.slug || item.articleId || '',
          articleId: item.articleId || '',
          isDisplayed: Boolean(item.isDisplayed),
          itemImageLink: item.itemImageLink || '',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          categorySlug: item.categorySlug || '',
          brandSlug: item.brandSlug || '',
          brand: item.brand || null,
          warrantyType: item.warrantyType || '',
          warrantyLength: typeof item.warrantyLength === 'number' ? item.warrantyLength : undefined,
          sellCounter: item.sellCounter || 0,
          category: item.category || {
            id: '',
            name: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            slug: '',
            isVisible: true,
            subCategories: []
          },
          subCategory: item.subCategory || {
            id: '',
            name: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            slug: '',
            isVisible: true,
            categorySlug: ''
          },
          // Properly map itemPrice array
          itemPrice: Array.isArray(item.itemPrice) ? item.itemPrice.map((price: any) => ({
            id: price.id || '',
            itemId: price.itemId || item.id || '',
            warehouseId: price.warehouseId || '',
            price: parseFloat(price.price) || 0,
            quantity: parseInt(price.quantity) || 0,
            promotionPrice: price.promotionPrice ? parseFloat(price.promotionPrice) : null,
            promoStartDate: price.promoStartDate ? new Date(price.promoStartDate) : null,
            promoEndDate: price.promoEndDate ? new Date(price.promoEndDate) : null,
            promoCode: price.promoCode || '',
            createdAt: price.createdAt ? new Date(price.createdAt) : new Date(),
            updatedAt: price.updatedAt ? new Date(price.updatedAt) : new Date(),
            warehouse: price.warehouse || {
              id: price.warehouseId || '',
              name: 'Unknown Warehouse',
              displayedName: 'Unknown Warehouse',
              isVisible: true,
              country: 'Other',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          })) : [],
          // Properly map itemDetails array
          itemDetails: Array.isArray(item.itemDetails) ? item.itemDetails.map((detail: any) => ({
            id: detail.id || '',
            itemId: detail.itemId || item.id || '',
            locale: detail.locale || '',
            itemName: detail.itemName || '',
            description: detail.description || '',
            specifications: detail.specifications || '',
            seller: detail.seller || '',
            discount: detail.discount ? parseFloat(detail.discount) : null,
            popularity: detail.popularity || null
          })) : [],
          linkedItems: item.linkedItems || [],
        };
        
        setInitialData(itemFormData);
      } else {
        console.error('Failed to fetch item:', response.status, response.statusText);
        router.push('/admin/items');
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      router.push('/admin/items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave? All changes will be lost.'
      );
      if (!confirmLeave) {
        return;
      }
    }
    
    router.push('/admin/items');
  };

  const handleSubmit = async () => {
    if (!formData) return;

    try {
      const response = await fetch(`/api/admin/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/admin/items');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Item not found</h1>
          <p className="text-gray-600 mt-2">The requested item could not be found.</p>
          <Button onClick={() => router.push('/admin/items')} className="mt-4">
            Back to Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
            <p className="text-gray-600 mt-1">Update the item information and details</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleGoBack}
            className="h-8 w-8 p-0 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Item Details</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="basic" className="mt-0">
                {formData && (
                  <BasicInformationStep 
                    formData={formData} 
                    setFormData={(value) => setItemFormData(value)} 
                  />
                )}
              </TabsContent>

              <TabsContent value="details" className="mt-0">
                {formData && (
                  <ItemDetailsStep 
                    formData={formData} 
                    setFormData={(value) => setItemFormData(value)} 
                  />
                )}
              </TabsContent>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleGoBack}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Item
              </Button>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
