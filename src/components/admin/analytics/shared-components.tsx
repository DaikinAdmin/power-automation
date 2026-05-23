import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getOrderStatusBadgeStyle } from '@/helpers/formatting';

export function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center gap-4">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getOrderStatusBadgeStyle(status))}>
      {status}
    </span>
  );
}