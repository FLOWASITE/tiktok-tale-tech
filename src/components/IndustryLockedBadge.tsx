import { Badge } from '@/components/ui/badge';
import { Lock, ShieldCheck, AlertTriangle, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'locked' | 'protected' | 'warning' | 'none';

interface IndustryLockedBadgeProps {
  variant: BadgeVariant;
  className?: string;
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<BadgeVariant, {
  icon: React.ElementType;
  label: string;
  className: string;
}> = {
  locked: {
    icon: Lock,
    label: 'LOCKED',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  protected: {
    icon: ShieldCheck,
    label: 'Industry Protected',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  warning: {
    icon: AlertTriangle,
    label: 'No Industry Protection',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  none: {
    icon: ShieldOff,
    label: 'Unprotected',
    className: 'bg-muted text-muted-foreground border-muted-foreground/20',
  },
};

/**
 * Badge showing Industry Memory protection status
 */
export function IndustryLockedBadge({
  variant,
  className,
  showLabel = true,
}: IndustryLockedBadgeProps) {
  const config = BADGE_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-medium gap-1 px-2 py-0.5",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
