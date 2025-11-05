'use client';

import { useState } from 'react';
import { MapPin, Package, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requestOutOfStockItem } from '@/lib/actions/products';
import { Badge as UiBadge } from '@/components/ui/badge';

interface WarehousePrice {
  id: string;
  warehouseId: string;
  displayedName: string;
  price: string;
  specialPrice?: string;
  originalPrice?: string;
  quantity: number;
  inStock: boolean;
  badge?: string | null;
}

interface WarehouseSelectorProps {
  warehouses: WarehousePrice[];
  selectedWarehouse: WarehousePrice;
  onWarehouseChange: (warehouse: WarehousePrice) => void;
  itemId: string;
  itemName: string;
}

export default function WarehouseSelector({ 
  warehouses, 
  selectedWarehouse, 
  onWarehouseChange,
  itemId,
  itemName
}: WarehouseSelectorProps) {
  const [showOutOfStockForm, setShowOutOfStockForm] = useState(false);
  const [outOfStockForm, setOutOfStockForm] = useState({
    email: '',
    name: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOutOfStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await requestOutOfStockItem(
        itemId,
        selectedWarehouse.warehouseId,
        outOfStockForm.email,
        outOfStockForm.message,
        outOfStockForm.name
      );

      if (result.success) {
        alert('Your request has been submitted! We will contact you when the item becomes available.');
        setShowOutOfStockForm(false);
        setOutOfStockForm({ email: '', name: '', message: '' });
      } else {
        alert('Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting out of stock request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const badgeLabels: Record<string, string> = {
    BESTSELLER: 'Bestseller',
    HOT_DEALS: 'Hot Deal',
    NEW_ARRIVALS: 'New',
    LIMITED_EDITION: 'Limited',
    ABSENT: 'Standard',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Warehouse</h3>
      
      <div className="grid gap-3">
        {warehouses.map((warehouse) => (
          <Card 
            key={warehouse.id}
            className={`p-4 cursor-pointer border-2 transition-colors ${
              selectedWarehouse.id === warehouse.id 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onWarehouseChange(warehouse)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="font-medium">{warehouse.displayedName}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {warehouse.specialPrice ? (
                    <>
                      <span className="text-lg font-bold text-red-600">
                        {warehouse.specialPrice}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        {warehouse.price}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-red-600">
                      {warehouse.price}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Package className="h-4 w-4" />
                  <span className={`text-sm ${
                    warehouse.inStock ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {warehouse.inStock 
                      ? `${warehouse.quantity} in stock`
                      : 'Out of stock'
                    }
                  </span>
                  {warehouse.badge && (
                    <UiBadge variant="secondary">
                      {badgeLabels[warehouse.badge] || warehouse.badge}
                    </UiBadge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!selectedWarehouse.inStock && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800">Item Not Available</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This item is currently out of stock at the selected warehouse.
              </p>
              
              <div className="mt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const inStockWarehouse = warehouses.find(w => w.inStock);
                    if (inStockWarehouse) {
                      onWarehouseChange(inStockWarehouse);
                    }
                  }}
                  className="mr-2"
                  disabled={!warehouses.some(w => w.inStock)}
                >
                  {warehouses.some(w => w.inStock) 
                    ? 'Switch to Available Warehouse'
                    : 'No Stock Available'
                  }
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOutOfStockForm(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Request When Available
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showOutOfStockForm && (
        <Card className="p-6 border-blue-200">
          <h4 className="font-semibold mb-4">Request "{itemName}" When Available</h4>
          <form onSubmit={handleOutOfStockSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={outOfStockForm.name}
                onChange={(e) => setOutOfStockForm({...outOfStockForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={outOfStockForm.email}
                onChange={(e) => setOutOfStockForm({...outOfStockForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={outOfStockForm.message}
                onChange={(e) => setOutOfStockForm({...outOfStockForm, message: e.target.value})}
                placeholder="Any specific requirements or questions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-red-500 hover:bg-red-600"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowOutOfStockForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
