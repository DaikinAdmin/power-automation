'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import parse from 'html-react-parser';
import PageLayout from '@/components/layout/page-layout';
import { InfoSidebar } from '@/components/info/info-sidebar';
import { InfoBreadcrumb } from '@/components/info/info-breadcrumb';

export default function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('info.contacts');

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        <main>
          <div className="max-w-[90rem] w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <InfoBreadcrumb locale={locale} pageName={t('title')} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
              <InfoSidebar locale={locale} />

              <div className="lg:col-span-3">
                <div className="rounded-lg border bg-white p-6 sm:p-8">
                  <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-gray-900">
                    {t('title')}
                  </h1>
                  <div className="prose prose-sm sm:prose max-w-none text-gray-700">
                    {parse(t('content'))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
