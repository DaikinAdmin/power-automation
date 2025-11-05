'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Stats', href: '/dashboard' },
  { label: 'User Info', href: '/dashboard/profile' },
  { label: 'Orders', href: '/dashboard/orders' },
  { label: 'Favorites', href: '/dashboard/favorites' },
  { label: 'Contact', href: '/dashboard/contact' },
];

export function DashboardSidebar() {
  const pathname = usePathname();

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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
