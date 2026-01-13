/**
 * EmptyStateCard - Reusable empty state component for consistent UI
 */

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
}

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateCardProps) {
  const sizeConfig = {
    sm: {
      padding: 'py-6',
      iconSize: 'h-8 w-8',
      titleSize: 'text-sm',
      descSize: 'text-xs',
    },
    md: {
      padding: 'py-12',
      iconSize: 'h-12 w-12',
      titleSize: 'text-base',
      descSize: 'text-sm',
    },
    lg: {
      padding: 'py-16',
      iconSize: 'h-16 w-16',
      titleSize: 'text-lg',
      descSize: 'text-base',
    },
  };

  const config = sizeConfig[size];

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className={cn('flex flex-col items-center justify-center text-center', config.padding)}>
        <div className="p-3 rounded-full bg-muted mb-4">
          <Icon className={cn('text-muted-foreground', config.iconSize)} />
        </div>
        <p className={cn('font-medium text-foreground', config.titleSize)}>
          {title}
        </p>
        {description && (
          <p className={cn('text-muted-foreground mt-1 max-w-sm', config.descSize)}>
            {description}
          </p>
        )}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-2 mt-4">
            {action && (
              <Button
                variant={action.variant || 'default'}
                size={size === 'sm' ? 'sm' : 'default'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || 'outline'}
                size={size === 'sm' ? 'sm' : 'default'}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
