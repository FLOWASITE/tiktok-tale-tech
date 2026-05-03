import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve seo_keywords IDs → keyword strings (for prompt injection).
 * Returns [] when ids empty.
 */
export function useKeywordsByIds(ids: string[] | undefined) {
  const sortedIds = [...(ids ?? [])].sort();
  return useQuery({
    queryKey: ['seo-keywords-by-ids', sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('seo_keywords')
        .select('id, keyword')
        .in('id', sortedIds);
      if (error) throw error;
      return (data || []).map((k: any) => k.keyword as string).filter(Boolean);
    },
  });
}
