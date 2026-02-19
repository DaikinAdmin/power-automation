import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/lib/auth';
import MainHeader from '@/components/layout/main-header';
import SecondaryHeader from '@/components/layout/secondary-header';
import { DashboardSidebar } from './_components/sidebar';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <MainHeader />
        <SecondaryHeader />
      </header>

      <div className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full max-w-xs shrink-0 rounded-lg border bg-white p-4 shadow-sm lg:h-fit">
          <DashboardSidebar role={session.user.role ?? undefined} />
        </aside>
        <main className="flex-1 rounded-lg border bg-white p-6 shadow-sm lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
