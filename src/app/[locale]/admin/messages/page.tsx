import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import prisma from '@/db';
import { format } from 'date-fns';

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
  const messages: MessageWithRelations[] = await prisma.messages.findMany({
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  const messageStats = {
    total: await prisma.messages.count(),
    today: await prisma.messages.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    thisWeek: await prisma.messages.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages Management</h1>
        <p className="text-gray-600">
          Monitor and respond to customer messages and inquiries.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.today}</div>
            <p className="text-xs text-gray-600">New messages today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageStats.thisWeek}</div>
            <p className="text-xs text-gray-600">Messages this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            Latest customer messages and inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Message</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
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
                          View
                        </button>
                        <button className="text-green-600 hover:text-green-900 text-sm">
                          Reply
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {messages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No messages found.
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
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common message management tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">Send Broadcast</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">Message Templates</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">Auto-Responses</span>
            </button>
            <button className="flex items-center justify-center p-3 border rounded-lg hover:bg-gray-50">
              <span className="text-sm font-medium">Export Messages</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
