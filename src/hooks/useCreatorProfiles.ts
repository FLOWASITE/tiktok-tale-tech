import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export function useCreatorProfiles(userIds: (string | null | undefined)[]) {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Filter out null/undefined and dedupe
  const uniqueUserIds = useMemo(() => {
    const filtered = userIds.filter((id): id is string => !!id);
    return [...new Set(filtered)];
  }, [userIds]);

  useEffect(() => {
    if (uniqueUserIds.length === 0) {
      setProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', uniqueUserIds);

        if (error) throw error;

        const profileMap: Record<string, CreatorProfile> = {};
        data?.forEach(profile => {
          profileMap[profile.id] = profile;
        });
        setProfiles(profileMap);
      } catch (err) {
        console.error('Error fetching creator profiles:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [uniqueUserIds.join(',')]); // Use joined string to avoid infinite loops

  return { profiles, isLoading };
}
