import React, { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const statusSizeClasses = {
  sm: 'h-2.5 w-2.5 border-[1.5px]',
  md: 'h-3 w-3 border-2',
  lg: 'h-3.5 w-3.5 border-2',
};

const statusPositionClasses = {
  sm: 'bottom-0 right-0',
  md: 'bottom-0 right-0',
  lg: 'bottom-0.5 right-0.5',
};

// Inner component that can receive refs
const MemberAvatarInner = forwardRef<HTMLDivElement, MemberAvatarProps & { statusLabel: string; initials: string }>(
  ({ avatarUrl, name, email, isOnline = false, size = 'md', showStatus = true, className, statusLabel, initials }, ref) => {
    return (
      <div ref={ref} className={cn('relative inline-block', className)}>
        <Avatar className={cn(sizeClasses[size], 'border border-border')}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {showStatus && (
          <span
            className={cn(
              'absolute rounded-full border-background',
              statusSizeClasses[size],
              statusPositionClasses[size],
              isOnline 
                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' 
                : 'bg-muted-foreground/40'
            )}
            aria-label={statusLabel}
          />
        )}
      </div>
    );
  }
);
MemberAvatarInner.displayName = 'MemberAvatarInner';

export const MemberAvatar = forwardRef<HTMLDivElement, MemberAvatarProps>(
  ({ avatarUrl, name, email, isOnline = false, size = 'md', showStatus = true, showTooltip = true, className }, ref) => {
    const getInitials = () => {
      if (name) {
        return name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
      }
      if (email && typeof email === 'string') {
        return email.charAt(0).toUpperCase();
      }
      return 'U';
    };

    const statusLabel = isOnline ? 'Đang hoạt động' : 'Ngoại tuyến';
    const initials = getInitials();

    if (!showTooltip) {
      return (
        <MemberAvatarInner
          ref={ref}
          avatarUrl={avatarUrl}
          name={name}
          email={email}
          isOnline={isOnline}
          size={size}
          showStatus={showStatus}
          className={className}
          statusLabel={statusLabel}
          initials={initials}
        />
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <MemberAvatarInner
            ref={ref}
            avatarUrl={avatarUrl}
            name={name}
            email={email}
            isOnline={isOnline}
            size={size}
            showStatus={showStatus}
            className={className}
            statusLabel={statusLabel}
            initials={initials}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/40'
              )}
            />
            <span>{statusLabel}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
);

MemberAvatar.displayName = 'MemberAvatar';
