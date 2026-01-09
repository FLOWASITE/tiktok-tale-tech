import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { getTokenExpiryStatus, TokenExpiryInfo } from '@/utils/tokenExpiry';
import { cn } from '@/lib/utils';

interface TokenExpiryBadgeProps {
  expiresAt: string | null | undefined;
  showValid?: boolean;
  className?: string;
}

export function TokenExpiryBadge({ expiresAt, showValid = false, className }: TokenExpiryBadgeProps) {
  const info = getTokenExpiryStatus(expiresAt);

  // Don't show badge for valid tokens unless explicitly requested
  if (info.status === 'valid' && !showValid) {
    return null;
  }

  // Don't show badge for unknown status
  if (info.status === 'unknown') {
    return null;
  }

  const variants: Record<string, { icon: React.ReactNode; badgeClass: string }> = {
    valid: {
      icon: <Clock className="h-3 w-3" />,
      badgeClass: 'bg-green-500/10 text-green-600 border-green-200',
    },
    expiring_soon: {
      icon: <AlertTriangle className="h-3 w-3" />,
      badgeClass: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    },
    expired: {
      icon: <XCircle className="h-3 w-3" />,
      badgeClass: 'bg-red-500/10 text-red-600 border-red-200',
    },
  };

  const variant = variants[info.status] || variants.valid;

  return (
    <Badge 
      variant="outline" 
      className={cn('text-xs gap-1', variant.badgeClass, className)}
    >
      {variant.icon}
      {info.message}
    </Badge>
  );
}
