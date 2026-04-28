import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number | string;
  delta?: number;
  hint?: string;
  loading?: boolean;
  tone?: 'default' | 'positive' | 'negative';
}

export function StatCard({ label, value, delta, hint, loading, tone = 'default' }: Props) {
  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-7 w-24" />
        <Skeleton className="mt-1 h-3 w-16" />
      </Card>
    );
  }

  const trendIcon =
    delta === undefined ? null : delta > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : delta < 0 ? (
      <TrendingDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tracking-tight',
          tone === 'positive' && 'text-emerald-600',
          tone === 'negative' && 'text-rose-600',
        )}
      >
        {value}
      </p>
      {(delta !== undefined || hint) && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trendIcon}
          {delta !== undefined && (
            <span>
              {delta > 0 ? '+' : ''}
              {delta} so kỳ trước
            </span>
          )}
          {hint && <span>{hint}</span>}
        </p>
      )}
    </Card>
  );
}
