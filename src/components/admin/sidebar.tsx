'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  DollarSign,
  CreditCard,
  Tags,
  BarChart3,
  Warehouse,
  BadgeCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const sidebarItems: SidebarItem[] = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      title: 'Warehouses',
      href: '/admin/warehouses',
      icon: <Warehouse className="h-5 w-5" />
    },
    {
      title: 'Products',
      href: '/admin/items',
      icon: <Package className="h-5 w-5" />
    },
    {
      title: 'Categories',
      href: '/admin/categories',
      icon: <Tags className="h-5 w-5" />
    },
    {
      title: 'Brands',
      href: '/admin/brands',
      icon: <BadgeCheck className="h-5 w-5" />
    },
    {
      title: 'Orders',
      href: '/admin/orders',
      icon: <ShoppingCart className="h-5 w-5" />
    },
    {
      title: 'Users',
      href: '/admin/users',
      icon: <Users className="h-5 w-5" />
    },
    {
      title: 'Currency Exchange',
      href: '/admin/currency-exchange',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      title: 'Payments',
      href: '/admin/payments',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      title: 'Analytics',
      href: '/admin/analytics',
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      title: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <div className={cn("pb-12 w-64 border-r min-h-screen", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight">
            Admin Panel
          </h2>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100",
                  pathname === item.href ? "bg-gray-100 text-primary" : "text-gray-700"
                )}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
