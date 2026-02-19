import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { auth } from '@/lib/auth';
import { EmployeesClient } from '@/components/dashboard/employees-client';

export default async function EmployeesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== 'company_owner') {
    redirect('/dashboard');
  }

  const t = await getTranslations('dashboard.employees');

  const employees = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      phoneNumber: schema.user.phoneNumber,
      countryCode: schema.user.countryCode,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(eq(schema.user.ownerId, session.user.id));

  const serializedEmployees = employees.map((e) => ({
    ...e,
    createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">{t('subtitle')}</p>
      </header>

      <EmployeesClient
        initialEmployees={serializedEmployees}
        ownerId={session.user.id}
      />
    </div>
  );
}
