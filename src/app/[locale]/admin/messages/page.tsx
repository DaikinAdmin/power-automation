import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { format } from 'date-fns';
import { desc, gte, count, sql } from 'drizzle-orm';

type MessageWithRelations = {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
  order: {
    id: string;
  };
};

export default async function MessagesPage() {
  const t = await getTranslations('adminDashboard');
  // Fetch messages with user and order data
  const messagesData = await db
    .select({
      id: schema.messages.id,
      content: schema.messages.content,
      createdAt: schema.messages.createdAt,
      userName: schema.user.name,
      userEmail: schema.user.email,
      orderId: schema.order.id,
    })
    .from(schema.messages)
    .leftJoin(schema.user, sql`${schema.messages.userId} = ${schema.user.id}`)
    .leftJoin(schema.order, sql`${schema.messages.orderId} = ${schema.order.id}`)
    .orderBy(desc(schema.messages.createdAt))
    .limit(50);

  const messages: MessageWithRelations[] = messagesData.map(m => ({
    id: m.id,
    content: m.content,
    createdAt: new Date(m.createdAt),
    user: {
      name: m.userName,
      email: m.userEmail || '',
    },
    order: {
      id: m.orderId || '',
    },
  }));

  // Count queries
  const [totalResult] = await db.select({ count: count() }).from(schema.messages);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayResult] = await db
    .select({ count: count() })
    .from(schema.messages)
    .where(gte(schema.messages.createdAt, today.toISOString()));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weekResult] = await db
    .select({ count: count() })
    .from(schema.messages)
    .where(gte(schema.messages.createdAt, weekAgo.toISOString()));

  const messageStats = {
    total: totalResult?.count || 0,
    today: todayResult?.count || 0,
    thisWeek: weekResult?.count || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('messages.title')}</h1>
        <p className="text-gray-600">
          {t('messages.description')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('messages.stats.total')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('messages.stats.today')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.today}</div>
            <p className="text-xs text-gray-600">{t('messages.stats.todayDesc')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('messages.stats.thisWeek')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.thisWeek}</div>
            <p className="text-xs text-gray-600">{t('messages.stats.thisWeekDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('messages.table.header')}</CardTitle>
          <CardDescription>
            {t('messages.table.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('messages.table.customer')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('messages.table.orderId')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('messages.table.message')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('messages.table.date')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">{t('messages.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{message.user.name}</div>
                      <div className="text-sm text-gray-600">{message.user.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-sm">#{message.order.id.slice(-8)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs truncate">
                        {message.content.length > 100 
                          ? `${message.content.substring(0, 100)}...`
                          : message.content
                        }
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {format(new Date(message.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          {t('messages.table.view')}
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm">
                          {t('messages.table.reply')}
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm">
                          {t('messages.table.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      {t('messages.table.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('messages.quickActions.title')}</CardTitle>
          <CardDescription>
            {t('messages.quickActions.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">{t('messages.quickActions.broadcast')}</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">{t('messages.quickActions.templates')}</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">{t('messages.quickActions.autoResponses')}</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">{t('messages.quickActions.export')}</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
