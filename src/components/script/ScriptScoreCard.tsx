import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScriptScoreCardProps {
  score: number;
  label: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function ScriptScoreCard({ 
  score, 
  label, 
  description,
  trend,
  className 
}: ScriptScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'from-green-500 to-emerald-500';
    if (s >= 60) return 'from-yellow-500 to-orange-500';
    if (s >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreTextColor = (s: number) => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className={cn(
      "relative p-4 rounded-xl bg-card border border-border overflow-hidden group hover:border-primary/50 transition-colors",
      className
    )}>
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 opacity-5 bg-gradient-to-br",
        getScoreColor(score)
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
          {trend && (
            <TrendIcon className={cn("w-4 h-4", trendColor)} />
          )}
        </div>

        <div className="flex items-end gap-2">
          <span className={cn("text-3xl font-bold", getScoreTextColor(score))}>
            {score}
          </span>
          <span className="text-muted-foreground text-sm mb-1">/100</span>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {description}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", getScoreColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
