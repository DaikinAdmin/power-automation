import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import ProfileForm from '@/components/dashboard/profile-form';

export default async function DashboardProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/');
  }

  const u = session.user as typeof session.user & {
    phoneNumber?: string;
    countryCode?: string;
    vatNumber?: string;
    companyName?: string;
    companyPosition?: string;
    addressLine?: string;
  };

  const t = await getTranslations('dashboard.profile');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-600">{t('subtitle')}</p>
      </header>

      <ProfileForm
        user={{
          name: u.name ?? '',
          email: u.email ?? '',
          phoneNumber: u.phoneNumber,
          countryCode: u.countryCode,
          vatNumber: u.vatNumber,
          companyName: u.companyName,
          companyPosition: u.companyPosition,
          addressLine: u.addressLine,
        }}
      />
    </div>
  );
}
