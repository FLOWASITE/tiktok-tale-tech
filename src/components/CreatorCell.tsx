import { MemberAvatar } from '@/components/MemberAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { CreatorProfile } from '@/hooks/useCreatorProfiles';

interface CreatorCellProps {
  profile?: CreatorProfile;
  isLoading?: boolean;
}

export function CreatorCell({ profile, isLoading }: CreatorCellProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  if (!profile) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Chưa rõ
      </span>
    );
  }

  const displayName = profile.full_name || (profile.email ? profile.email.split('@')[0] : 'Người dùng');

  return (
    <div className="flex items-center gap-2 min-w-0">
      <MemberAvatar
        avatarUrl={profile.avatar_url}
        name={profile.full_name}
        email={profile.email}
        size="sm"
        showStatus={false}
      />
      <span className="text-sm truncate max-w-[100px]" title={displayName}>
        {displayName}
      </span>
    </div>
  );
}
