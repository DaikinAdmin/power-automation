import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { StatsCard } from '@/components/dashboard/stats-card';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || 'there';
  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-gray-500">{t('welcomeBack')}</p>
        <h1 className="text-3xl font-bold text-gray-900">{t('statsOverview')}</h1>
        <p className="text-gray-600">
          {t('greeting', { name: displayName })}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t('stats.ordersPlaced')}
          value="—"
          description={t('descriptions.analyticsComingSoon')}
        />
        <StatsCard
          title={t('stats.itemsPurchased')}
          value="—"
          description={t('descriptions.trendingCategories')}
        />
        <StatsCard
          title={t('stats.totalSpend')}
          value="—"
          description={t('descriptions.currencySummaries')}
        />
        <StatsCard
          title={t('stats.supportTickets')}
          value="0"
          description={t('descriptions.contactSupport')}
        />
      </section>

      <section className="rounded-lg border bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('whatsNext.title')}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>{t('whatsNext.visualizeSpending')}</li>
          <li>{t('whatsNext.trackOrders')}</li>
          <li>{t('whatsNext.loyaltyRewards')}</li>
        </ul>
      </section>
    </div>
  );
}
