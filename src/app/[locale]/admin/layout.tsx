import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/sidebar';
import prisma from '@/db';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect if not authenticated
  if (!session) {
    redirect('/signin');
  }

  // Get user role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, email: true },
  });

  // Redirect if not admin
  if (!user || (user.role !== 'admin' && user.role !== 'employee')) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <AdminHeader user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }} />
        {children}
      </div>
    </div>
  );
}
