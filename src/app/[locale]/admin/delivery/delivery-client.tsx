'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { DeliveryItem, Stats } from '@/types/delivery';
import { DeliveryEditModal } from '@/components/admin/delivery/delivery-edit-modal';
import { DeliveryStats } from '@/components/admin/delivery/delivery-stats';
import { DeliveryFilters } from '@/components/admin/delivery/delivery-filters';
import { DeliveryTable } from '@/components/admin/delivery/delivery-table';

export default function DeliveryClient() {
  const t = useTranslations('adminDashboard.delivery');
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingDelivery, setEditingDelivery] = useState<DeliveryItem | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      
      const res = await fetch(`/api/admin/delivery?${params}`);
      if (!res.ok) throw new Error('Failed to load deliveries');
      
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
      setStats(data.stats ?? {});
    } catch {
      toast.error(t('toast.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, t]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleSaved = (updated: DeliveryItem) => {
    setDeliveries((prev) => prev.map((d) => d.id === updated.id ? updated : d));
    setEditingDelivery(null);
  };

  return (
    <div className="space-y-6">
      {editingDelivery && (
        <DeliveryEditModal
          delivery={editingDelivery}
          onClose={() => setEditingDelivery(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>
      </div>

      <DeliveryStats stats={stats} isLoading={isLoading} />

      <DeliveryFilters 
        statusFilter={statusFilter} 
        setStatusFilter={setStatusFilter} 
        typeFilter={typeFilter} 
        setTypeFilter={setTypeFilter} 
      />

      <DeliveryTable 
        deliveries={deliveries} 
        isLoading={isLoading} 
        onEdit={setEditingDelivery} 
      />
    </div>
  );
}