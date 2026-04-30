import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import ProfileForm from '@/components/dashboard/profile-form';
import type { AuthUser } from '@/helpers/types/user';

export default async function DashboardProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/');
  }

  const user = session.user as AuthUser;

  const t = await getTranslations('dashboard.profile');

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-600">{t('subtitle')}</p>
      </header>

      <ProfileForm
        user={{
          name: user.name ?? '',
          email: user.email ?? '',
          phoneNumber: user.phoneNumber,
          countryCode: user.countryCode,
          vatNumber: user.vatNumber,
          companyName: user.companyName,
          companyPosition: user.companyPosition,
          addressLine: user.addressLine,
          userType: user.userType,
        }}
      />
    </div>
  );
}
