import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Stats } from '@/types/delivery';

interface Props {
  stats: Stats;
  isLoading: boolean;
}

export function DeliveryStats({ stats, isLoading }: Props) {
  const t = useTranslations('adminDashboard.delivery');
  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0);
  const inTransitCount = stats['IN_TRANSIT'] ?? 0;
  const pendingCount = (stats['PENDING'] ?? 0) + (stats['PROCESSING'] ?? 0);
  const deliveredCount = stats['DELIVERED'] ?? 0;

  const cards = [
    { label: t('stats.total'), value: totalCount, color: 'text-gray-900' },
    { label: t('stats.inTransit'), value: inTransitCount, color: 'text-indigo-700' },
    { label: t('stats.pending'), value: pendingCount, color: 'text-yellow-700' },
    { label: t('stats.delivered'), value: deliveredCount, color: 'text-green-700' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          )}
        </div>
      ))}
    </div>
  );
}