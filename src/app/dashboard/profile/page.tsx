import { headers } from 'next/headers';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';

export default async function DashboardProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Profile settings</h1>
        <p className="text-sm text-gray-600">Update your personal information. Your email address stays read-only for security.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Editable fields will arrive with the profile management milestone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <div>
            <span className="font-medium">Email:</span> {user?.email ?? '—'}
          </div>
          <div>
            <span className="font-medium">Name:</span> {user?.name ?? '—'}
          </div>
          <p className="text-xs text-gray-500">
            We&rsquo;ll surface editable fields (name, phone, address) here soon, including validation and audit history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
