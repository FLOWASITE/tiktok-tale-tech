import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { CreativeScore, ScoreBreakdown, CreativeGrade } from '@/types/creativeScore';

interface ScoreAdCreativeParams {
  variationId: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  ctaButton?: string;
  platform?: string;
  objective?: string;
}

interface ScoreResponse {
  overall_score: number;
  grade: CreativeGrade;
  headline_score?: number;
  primary_text_score?: number;
  cta_score?: number;
  emotional_appeal_score?: number;
  clarity_score?: number;
  urgency_score?: number;
  relevance_score?: number;
  score_breakdown?: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  optimization_priority?: string;
}

export function useCreativeScore(variationId?: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  // Fetch creative score for a variation
  const { data: score, isLoading, error } = useQuery({
    queryKey: ['creative-score', variationId],
    queryFn: async () => {
      if (!variationId) return null;
      
      const { data, error } = await supabase
        .from('ad_copy_creative_scores')
        .select('*')
        .eq('variation_id', variationId)
        .order('scored_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as CreativeScore | null;
    },
    enabled: !!variationId,
  });

  // Score ad creative using AI
  const scoreCreative = useMutation({
    mutationFn: async (params: ScoreAdCreativeParams) => {
      const { data, error } = await supabase.functions.invoke('score-ad-creative', {
        body: params,
      });
      
      if (error) throw error;
      
      const scoreData = data as ScoreResponse;
      
      // Save score to database
      const { error: insertError } = await supabase
        .from('ad_copy_creative_scores')
        .insert([{
          variation_id: params.variationId,
          overall_score: scoreData.overall_score,
          grade: scoreData.grade,
          headline_score: scoreData.headline_score,
          primary_text_score: scoreData.primary_text_score,
          cta_score: scoreData.cta_score,
          emotional_appeal_score: scoreData.emotional_appeal_score,
          clarity_score: scoreData.clarity_score,
          urgency_score: scoreData.urgency_score,
          relevance_score: scoreData.relevance_score,
          score_breakdown: scoreData.score_breakdown ? JSON.parse(JSON.stringify(scoreData.score_breakdown)) : null,
          strengths: scoreData.strengths,
          weaknesses: scoreData.weaknesses,
          optimization_priority: scoreData.optimization_priority,
          organization_id: currentOrganization?.id,
        }]);
      
      if (insertError) throw insertError;
      
      return scoreData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creative-score', variables.variationId] });
    },
  });

  return {
    score,
    isLoading,
    error,
    scoreCreative,
  };
}

// Hook to fetch scores for multiple variations
export function useCreativeScores(variationIds: string[]) {
  return useQuery({
    queryKey: ['creative-scores', variationIds],
    queryFn: async () => {
      if (!variationIds.length) return {};
      
      const { data, error } = await supabase
        .from('ad_copy_creative_scores')
        .select('*')
        .in('variation_id', variationIds)
        .order('scored_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by variation_id, keeping only the latest score
      const scoreMap: Record<string, CreativeScore> = {};
      (data as CreativeScore[]).forEach(score => {
        if (!scoreMap[score.variation_id]) {
          scoreMap[score.variation_id] = score;
        }
      });
      
      return scoreMap;
    },
    enabled: variationIds.length > 0,
  });
}
