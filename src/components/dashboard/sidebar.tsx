'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { useTranslations } from 'next-intl';

const baseNavItems = [
  { label: 'stats', href: '/dashboard' },
  { label: 'userInfo', href: '/dashboard/profile' },
  { label: 'orders', href: '/dashboard/orders' },
  { label: 'favorites', href: '/dashboard/favorites' },
  { label: 'contact', href: '/dashboard/contact' },
];

const ownerNavItems = [
  { label: 'userManagement', href: '/dashboard/employees' },
];

export function DashboardSidebar() {
  const t = useTranslations('dashboard.sidebar');
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const navItems = role === 'company_owner'
    ? [...baseNavItems, ...ownerNavItems]
    : baseNavItems;

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-red-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}
