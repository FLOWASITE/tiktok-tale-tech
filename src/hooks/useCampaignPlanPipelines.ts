import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AgentPipelineStage } from '@/types/agent';

export interface AgentPipelineLite {
  id: string;
  current_stage: AgentPipelineStage;
  is_flagged: boolean;
  flag_reason: string | null;
  content_id: string | null;
  completed_at: string | null;
  overall_quality_score: number | null;
  updated_at: string;
}

/**
 * Fetch the actual pipeline state for every piece in a campaign plan.
 * Subscribes to realtime updates filtered by campaign_plan_id so badges
 * stay accurate while agents are running.
 */
export function useCampaignPlanPipelines(planId: string | undefined, pipelineIds: string[]) {
  const queryClient = useQueryClient();
  const ids = useMemo(() => Array.from(new Set(pipelineIds.filter(Boolean))), [pipelineIds]);
  const queryKey = ['campaign-plan-pipelines', planId, ids.join(',')];

  const { data = [], isLoading } = useQuery({
    queryKey,
    enabled: !!planId && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_pipelines')
        .select('id, current_stage, is_flagged, flag_reason, content_id, completed_at, overall_quality_score, updated_at')
        .in('id', ids);
      if (error) throw error;
      return (data || []) as AgentPipelineLite[];
    },
  });

  // Realtime: refetch when any pipeline of this plan changes
  useEffect(() => {
    if (!planId) return;
    const channel = supabase
      .channel(`campaign-plan-pipelines-${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_pipelines',
          filter: `campaign_plan_id=eq.${planId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign-plan-pipelines', planId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, queryClient]);

  const map = useMemo(() => {
    const m = new Map<string, AgentPipelineLite>();
    for (const p of data) m.set(p.id, p);
    return m;
  }, [data]);

  return { pipelinesById: map, isLoading };
}
