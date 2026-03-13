'use client';

import { useState } from 'react';
import { MapPin, Package, AlertCircle, Mail, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { requestOutOfStockItem } from '@/lib/actions/products';
import { Badge as UiBadge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { useDomainKey } from '@/hooks/useDomain';
import type { DomainKey } from '@/lib/domain-config';

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
  deliveryDaysPoland?: number | null;
  deliveryDaysUkraine?: number | null;
  deliveryDaysEurope?: number | null;
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
  const t = useTranslations('product.warehouseSelector');
  const tBadges = useTranslations('product.price.badges');
  const domainKey = useDomainKey();

  const getDeliveryDays = (warehouse: WarehousePrice): number | null => {
    if (domainKey === 'pl') return warehouse.deliveryDaysPoland ?? null;
    if (domainKey === 'ua') return warehouse.deliveryDaysUkraine ?? null;
    return warehouse.deliveryDaysEurope ?? null;
  };

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
        alert(t('successMessage'));
        setShowOutOfStockForm(false);
        setOutOfStockForm({ email: '', name: '', message: '' });
      } else {
        alert(t('errorMessage'));
      }
    } catch (error) {
      console.error('Error submitting out of stock request:', error);
      alert(t('errorMessage'));
    } finally {
      setSubmitting(false);
    }
  };

  const badgeLabels: Record<string, string> = {
    BESTSELLER: tBadges('bestseller'),
    HOT_DEALS: tBadges('hotDeal'),
    NEW_ARRIVALS: tBadges('new'),
    LIMITED_EDITION: tBadges('limited'),
    ABSENT: tBadges('standard'),
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      
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
                  {(() => {
                    const days = getDeliveryDays(warehouse);
                    return days != null ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Truck className="h-3 w-3" />
                        <span>{t('deliveryDays', { days })}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
              
              <div className="text-right">
                {warehouse.inStock ? (
                  <>
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
                      <span className="text-sm text-green-600">
                        {t('inStock', { quantity: warehouse.quantity })}
                      </span>
                      {warehouse.badge && (
                        <UiBadge variant="secondary">
                          {badgeLabels[warehouse.badge] || warehouse.badge}
                        </UiBadge>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-right space-y-1">
                    <p className="text-sm font-semibold text-red-600">
                      {t('outOfStockTitle')}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">{t('lastPrice')}: </span>
                      <span className="font-bold text-gray-800">{warehouse.price}</span>
                    </p>
                    <p className="text-xs text-gray-400 max-w-[200px]">
                      {t('contactManager')}
                    </p>
                  </div>
                )}
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
              <div className="mt-0 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const inStockWarehouse = warehouses.find(w => w.inStock);
                    if (inStockWarehouse) {
                      onWarehouseChange(inStockWarehouse);
                    }
                  }}
                  disabled={!warehouses.some(w => w.inStock)}
                >
                  {warehouses.some(w => w.inStock)
                    ? t('switchToAvailable')
                    : t('noStockAvailable')
                  }
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOutOfStockForm(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('requestWhenAvailable')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showOutOfStockForm && (
        <Card className="p-6 border-blue-200">
          <h4 className="font-semibold mb-4">{t('requestFormTitle', { itemName })}</h4>
          <form onSubmit={handleOutOfStockSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('yourName')}
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
                {t('email')}
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
                {t('messageOptional')}
              </label>
              <textarea
                value={outOfStockForm.message}
                onChange={(e) => setOutOfStockForm({...outOfStockForm, message: e.target.value})}
                placeholder={t('messagePlaceholder')}
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
                {submitting ? t('submitting') : t('submit')}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setShowOutOfStockForm(false)}
              >
                {t('cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
