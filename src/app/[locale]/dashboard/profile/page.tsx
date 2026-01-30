import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';

export default async function DashboardProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  const t = await getTranslations('dashboard.profile');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-600">{t('subtitle')}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('accountDetails')}</CardTitle>
          <CardDescription>{t('accountDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div>
            <span className="font-medium">{t('email')}</span> {user?.email ?? '—'}
          </div>
          <div>
            <span className="font-medium">{t('name')}</span> {user?.name ?? '—'}
          </div>
          <p className="text-xs text-gray-500">
            {t('editNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
