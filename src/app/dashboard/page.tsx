import { headers } from 'next/headers';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const displayName = session?.user?.name || 'there';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-gray-500">Welcome back</p>
        <h1 className="text-3xl font-bold text-gray-900">Stats overview</h1>
        <p className="text-gray-600">
          Hi {displayName}, here&rsquo;s a quick snapshot of your recent activity. Detailed reports are on the way.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Orders placed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">—</p>
            <p className="text-xs text-gray-500">Analytics coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Items purchased</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">—</p>
            <p className="text-xs text-gray-500">We&rsquo;ll highlight trending categories next</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total spend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">—</p>
            <p className="text-xs text-gray-500">Currency-aware summaries will appear here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open support tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Reach out any time from the Contact section</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">What&rsquo;s next?</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Visualize spending over time with monthly charts.</li>
          <li>Track order fulfillment stages in real time.</li>
          <li>Keep an eye on loyalty rewards and upcoming renewals.</li>
        </ul>
      </section>
    </div>
  );
}
