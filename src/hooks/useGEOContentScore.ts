import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GEOContentScore {
  id: string;
  content_id: string;
  content_type: string;
  organization_id: string;
  overall_score: number;
  factor_scores: Record<string, number>;
  issues: any[];
  suggestions: any[];
  last_scored_at: string;
}

export function useGEOContentScore(contentId?: string) {
  return useQuery({
    queryKey: ['geo-content-score', contentId],
    queryFn: async () => {
      if (!contentId) return null;
      const { data, error } = await supabase
        .from('geo_content_scores')
        .select('*')
        .eq('content_id', contentId)
        .order('last_scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as GEOContentScore | null;
    },
    enabled: !!contentId,
  });
}

export function useGEOContentScores(contentIds: string[]) {
  return useQuery({
    queryKey: ['geo-content-scores', contentIds],
    queryFn: async () => {
      if (!contentIds.length) return {};
      const { data, error } = await supabase
        .from('geo_content_scores')
        .select('*')
        .in('content_id', contentIds)
        .order('last_scored_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, GEOContentScore> = {};
      (data as GEOContentScore[]).forEach(s => {
        if (!map[s.content_id]) map[s.content_id] = s;
      });
      return map;
    },
    enabled: contentIds.length > 0,
  });
}
