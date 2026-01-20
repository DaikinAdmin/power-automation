'use client';

import { useState, useEffect, useRef, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Upload, Edit } from 'lucide-react';
import { Item, Category, ItemPrice } from '@/helpers/types/item';
import type { Warehouse, Brand, Badge, SubCategories } from '@/db/schema';
import { PriceEditModal } from '@/components/admin/price-edit-modal';

interface BasicInformationStepProps {
  formData: Item;
  setFormData: React.Dispatch<React.SetStateAction<Item>>;
}

export function BasicInformationStep({ formData, setFormData }: BasicInformationStepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [newPriceEntry, setNewPriceEntry] = useState<ItemPrice>({
    id: '',
    itemSlug: '',
    warehouseId: '',
    price: 0,
    quantity: 0,
    promotionPrice: null,
    promoEndDate: null,
    promoCode: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    badge: 'ABSENT',
    history: [],
    warehouse: {
      id: '',
      name: '',
      displayedName: '',
      isVisible: true,
      countrySlug: 'other',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const warrantyTypeOptions = [
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'seller', label: 'Seller' },
  ];

  const badgeOptions = [
    { value: 'ABSENT', label: 'None' },
    { value: 'NEW_ARRIVALS', label: 'New Arrivals' },
    { value: 'BESTSELLER', label: 'Bestseller' },
    { value: 'HOT_DEALS', label: 'Hot Deals' },
    { value: 'LIMITED_EDITION', label: 'Limited Edition' },
  ];

  useEffect(() => {
    fetchCategories();
    fetchWarehouses();
    fetchBrands();
  }, []);

  // Add debug logging to see what data is being passed
  // useEffect(() => {
  //   console.log('BasicInformationStep received formData:', formData);
  //   console.log('BasicInformationStep itemPrice:', formData.itemPrice);
  //   console.log('BasicInformationStep itemPrice length:', formData.itemPrice?.length);
  // }, [formData]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/admin/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/admin/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Here you would typically upload the file to your storage service
      // For now, we'll just store the file name
      setFormData((prev: any) => ({
        ...prev,
        itemImageLink: file.name
      }));
    }
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.slug === formData.categorySlug);
  };

  const addPriceEntry = () => {
    if (!newPriceEntry.warehouseId || newPriceEntry.price <= 0 || newPriceEntry.quantity < 0) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate promotion end date if promotion price is set
    if (newPriceEntry.promotionPrice && !newPriceEntry.promoEndDate) {
      alert('Please provide an end date for the promotion');
      return;
    }

    const warehouse = warehouses.find(w => w.id === newPriceEntry.warehouseId);
    
    const priceEntryToAdd = {
      id: `temp-${Date.now()}`,
      itemSlug: formData.articleId || '',
      warehouseId: newPriceEntry.warehouseId,
      price: newPriceEntry.price,
      quantity: newPriceEntry.quantity,
      promotionPrice: newPriceEntry.promotionPrice || null,
      promoStartDate: null,
      promoEndDate: newPriceEntry.promoEndDate || null,
      promoCode: newPriceEntry.promoCode || '',
      badge: newPriceEntry.badge || 'ABSENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
      warehouse: warehouse || {
        id: newPriceEntry.warehouseId,
        name: 'Unknown',
        displayedName: 'Unknown',
        isVisible: true,
        countrySlug: 'other',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };

    setFormData((prev: Item) => ({
      ...prev,
      itemPrice: [...prev.itemPrice, priceEntryToAdd]
    }));

    // Reset form
    setNewPriceEntry({
      id: '',
      itemSlug: '',
      warehouseId: '',
      price: 0,
      quantity: 0,
      promotionPrice: null,
      promoEndDate: null,
      promoCode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      badge: 'ABSENT',
      history: [],
      warehouse: {
        id: '',
        name: '',
        displayedName: '',
        isVisible: true,
        countrySlug: 'other',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
    setIsAddingPrice(false);
  };

  const removePriceEntry = (index: number) => {
    setFormData((prev: Item) => ({
      ...prev,
      itemPrice: prev.itemPrice.filter((_: any, i: number) => i !== index)
    }));
  };

  const startEditPrice = (index: number) => {
    setEditingPriceIndex(index);
    setIsEditingPrice(true);
  };

  const handleSaveEditedPrice = (updatedPrice: ItemPrice) => {
    if (editingPriceIndex !== null) {
      const updatedPrices = [...formData.itemPrice];
      updatedPrices[editingPriceIndex] = updatedPrice;
      setFormData((prev: any) => ({ ...prev, itemPrice: updatedPrices }));
    }
    setIsEditingPrice(false);
    setEditingPriceIndex(null);
  };

  const handleCloseEditPrice = () => {
    setIsEditingPrice(false);
    setEditingPriceIndex(null);
  };

  // Helper function to check if promotion is currently active (only based on end date)
  const isPromotionActive = (startDate: string | Date | null, endDate: string | Date | null) => {
    if (!endDate) return false;
    const now = new Date();
    const end = new Date(endDate);
    return now <= end;
  };

  // Helper function to get effective price (promotion if active, otherwise regular price)
  const getEffectivePrice = (price: number, promotionPrice: number | null, startDate: string | Date | null, endDate: string | Date | null) => {
    if (promotionPrice && isPromotionActive(startDate, endDate)) {
      return promotionPrice;
    }
    return price;
  };

  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Article ID */}
          <div>
            <Label htmlFor="articleId">Article ID *</Label>
            <Input
              id="articleId"
              value={formData.articleId}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, articleId: e.target.value }))}
              className="mt-1"
              placeholder="Enter article ID"
              required
            />
          </div>

          {/* Display Item Toggle */}
          <div className="flex items-center space-x-2 mt-6">
            <Switch
              id="isDisplayed"
              checked={formData.isDisplayed}
              onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, isDisplayed: checked }))}
            />
            <Label htmlFor="isDisplayed">Display Item</Label>
          </div>

          {/* Brand */}
          <div>
            <Label>Brand *</Label>
            <select
              value={formData.brandSlug || ''}
              onChange={(e) => {
                const brandSlug = e.target.value;
                const brand = brands.find((b) => b.alias === brandSlug) || null;
                setFormData((prev: any) => ({
                  ...prev,
                  brandSlug: brandSlug ? brandSlug : null,
                  brandName: brand?.name || '',
                  brand,
                }));
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
              required
            >
              <option value="">Select Brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.alias}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image Upload */}
          <div className="col-span-2">
            <Label>Item Image</Label>
            <div className="mt-1 flex items-center space-x-2">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Image</span>
              </Button>
              {formData.itemImageLink && (
                <span className="text-sm text-gray-600">{formData.itemImageLink}</span>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label>Category *</Label>
            <select
              value={formData.categorySlug}
              onChange={(e) => setFormData((prev: Item) => ({ 
                ...prev, 
                categorySlug: e.target.value,
                category: categories.find(cat => cat.slug === e.target.value) || prev.category
              }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
              required
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warranty Type */}
          <div>
            <Label>Warranty Type</Label>
            <select
              value={formData.warrantyType || ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, warrantyType: e.target.value || null }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
            >
              <option value="">Select Warranty Type</option>
              {warrantyTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Warranty Length */}
          <div>
            <Label>Warranty Length (months)</Label>
            <Input
              type="number"
              min="0"
              value={formData.warrantyLength ?? ''}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, warrantyLength: e.target.value ? parseInt(e.target.value) : null }))}
              className="mt-1"
              placeholder="Enter warranty length"
            />
          </div>
        </div>
      </div>

      {/* Separator */}
      <hr className="border-gray-200" />

      {/* Pricing Information Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Pricing Information</h3>
          <Button
            type="button"
            onClick={() => setIsAddingPrice(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Price</span>
          </Button>
        </div>
        
        {/* Prices Table */}
        {formData.itemPrice && formData.itemPrice.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Warehouse</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Price</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Quantity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Badge</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Promotion</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Promo Period</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.itemPrice.map((price: { promoEndDate: string | number | Date | null; price: number; promotionPrice: number | null; badge: any; id: any; warehouse: { displayedName: any; name: any; }; warehouseId: any; quantity: any; }, index: number) => {
                  // console.log(`Rendering price row ${index}:`, price);
                  const isPromoActive = isPromotionActive(new Date(), price.promoEndDate as Date);
                  const effectivePrice = getEffectivePrice(price.price, price.promotionPrice, new Date(), price.promoEndDate as Date);
                  const badgeLabel = badgeOptions.find(option => option.value === (price.badge || 'ABSENT'))?.label || 'None';

                  return (
                    <tr key={price.id || `price-${index}`}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.warehouse?.displayedName || price.warehouse?.name || `Warehouse ID: ${price.warehouseId}` || 'Unknown Warehouse'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className={effectivePrice !== price.price ? 'line-through text-gray-500 text-xs' : ''}>
                            ${typeof price.price === 'number' ? price.price.toFixed(2) : parseFloat(String(price.price || 0)).toFixed(2)}
                          </span>
                          {effectivePrice !== price.price && (
                            <span className="text-red-600 font-medium">
                              ${effectivePrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.quantity || 0}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {badgeLabel}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.promotionPrice ? (
                          <div className="flex flex-col">
                            <span className={`text-xs px-2 py-1 rounded ${isPromoActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                              ${price.promotionPrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {isPromoActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {price.promoEndDate ? (
                          <div className="text-xs">
                            <div>Valid until:</div>
                            <div>{new Date(price.promoEndDate).toLocaleDateString()}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditPrice(index)}
                            className="text-xs"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePriceEntry(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
            <p>No prices added yet. Click "Add Price" to get started.</p>
            <p className="text-xs mt-2">Debug: formData.itemPrice = {JSON.stringify(formData.itemPrice)}</p>
          </div>
        )}

        {/* Add Price Form */}
        {isAddingPrice && (
          <div className="mt-4 border rounded-lg p-4 space-y-4 bg-gray-50">
            <h4 className="font-medium">Add New Price</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warehouse *</Label>
                <select
                  value={newPriceEntry.warehouseId}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, warehouseId: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mt-1"
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.displayedName || warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPriceEntry.price}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={newPriceEntry.quantity}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Label>Badge</Label>
                <select
                  value={newPriceEntry.badge || 'ABSENT'}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, badge: e.target.value as Badge }))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {badgeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Promotion Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPriceEntry.promotionPrice || ''}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, promotionPrice: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Promotion End Date</Label>
                <Input
                  type="datetime-local"
                  value={newPriceEntry.promoEndDate ? new Date(newPriceEntry.promoEndDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, promoEndDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Promo Code</Label>
                <Input
                  value={newPriceEntry.promoCode || ''}
                  onChange={(e) => setNewPriceEntry((prev: any) => ({ ...prev, promoCode: e.target.value }))}
                  className="mt-1"
                  placeholder="Enter promo code"
                />
              </div>
            </div>

            {/* Promotion Preview */}
            {newPriceEntry.promotionPrice && newPriceEntry.promoEndDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Promotion Preview</h5>
                <p className="text-sm text-blue-800">
                  {isPromotionActive(null, newPriceEntry.promoEndDate) ? (
                    <span className="text-green-600">✓ This promotion is currently active</span>
                  ) : (
                    <span className="text-gray-600">This promotion has expired</span>
                  )}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Valid until {new Date(newPriceEntry.promoEndDate).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingPrice(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addPriceEntry}
              >
                Add Price
              </Button>
            </div>
          </div>
        )}

        {/* Price Edit Modal */}
        {isEditingPrice && editingPriceIndex !== null && (
          <PriceEditModal
            isOpen={isEditingPrice}
            onClose={handleCloseEditPrice}
            priceEntry={formData.itemPrice[editingPriceIndex]}
            onSave={handleSaveEditedPrice}
          />
        )}
      </div>
    </div>
  );
}
