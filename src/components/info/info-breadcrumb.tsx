'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InfoBreadcrumbProps {
  locale: string;
  pageName: string;
}

export function InfoBreadcrumb({ locale, pageName }: InfoBreadcrumbProps) {
  const t = useTranslations('common');

  return (
    <nav className="mb-6 flex items-center text-sm text-gray-600">
      <Link
        href={`/${locale}`}
        className="hover:text-gray-900 transition-colors"
      >
        {t('breadcrumb.home')}
      </Link>
      <ChevronRight className="mx-2 h-4 w-4" />
      <span className="text-gray-900 font-medium">{pageName}</span>
    </nav>
  );
}
