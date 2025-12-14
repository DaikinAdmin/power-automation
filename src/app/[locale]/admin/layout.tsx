import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/sidebar';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  const [user] = await db
    .select({ role: schema.user.role, name: schema.user.name, email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, session.user.id))
    .limit(1);

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
