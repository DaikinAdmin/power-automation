'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialTab } from '@/components/admin/analytics/financial-tab';
import { InventoryTab } from '@/components/admin/analytics/inventory-tab';
import { useQueryParam } from '@/hooks/useQueryParam';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const t = useTranslations('adminDashboard.analytics');
  const [tab, setTab] = useQueryParam('tab', 'financial');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <Tabs value={tab ?? 'financial'} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="financial">{t('tabs.financial')}</TabsTrigger>
          <TabsTrigger value="inventory">{t('tabs.inventory')}</TabsTrigger>
        </TabsList>
        <TabsContent value="financial" className="mt-6">
          <FinancialTab />
        </TabsContent>
        <TabsContent value="inventory" className="mt-6">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
