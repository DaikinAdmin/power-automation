'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface InfoSidebarProps {
  locale: string;
}

export function InfoSidebar({ locale }: InfoSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('info');

  const menuItems = [
    { href: `/${locale}/about`, label: t('menu.about'), key: 'about' },
    { href: `/${locale}/brands`, label: t('menu.brands'), key: 'brands' },
    { href: `/${locale}/payment-delivery`, label: t('menu.paymentDelivery'), key: 'payment-delivery' },
    { href: `/${locale}/returns`, label: t('menu.returns'), key: 'returns' },
    { href: `/${locale}/contacts`, label: t('menu.contacts'), key: 'contacts' },
  ];

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 self-start">
        <nav className="rounded-lg border bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t('menu.title')}
          </h2>
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname.includes(`/${item.key}`);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#404040] text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
