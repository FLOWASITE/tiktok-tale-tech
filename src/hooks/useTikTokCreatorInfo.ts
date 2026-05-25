import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'FOLLOWER_OF_CREATOR'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'SELF_ONLY';

export interface TikTokCreatorInfo {
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
  creatorAvatarUrl: string | null;
  creatorNickname: string | null;
  creatorUsername: string | null;
}

export function useTikTokCreatorInfo(connectionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['tiktok-creator-info', connectionId],
    enabled: Boolean(connectionId) && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<TikTokCreatorInfo> => {
      const { data, error } = await supabase.functions.invoke('get-tiktok-creator-info', {
        body: { connectionId },
      });
      if (error) throw new Error(error.message || 'TikTok creator info failed');
      if (!data?.success) throw new Error(data?.error || 'TikTok creator info failed');
      return data.data as TikTokCreatorInfo;
    },
  });
}
