import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { AgentPipeline, AgentPipelineStage } from '@/types/agent';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAgentPipelines(goalId?: string) {
  // Note: Pipeline stages are now: strategy, create, quality, approval, publish, analyze
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['agent-pipelines', orgId, goalId],
    queryFn: async () => {
      if (!orgId) return [];
      // Limit to recent 200 pipelines to avoid silent 1000-row Supabase cap
      let q = supabase
        .from('agent_pipelines')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (goalId) q = q.eq('goal_id', goalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AgentPipeline[];
    },
    enabled: !!orgId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`agent-pipelines-${orgId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_pipelines',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: AgentPipelineStage }) => {
      const { error } = await supabase
        .from('agent_pipelines')
        .update({ current_stage: stage } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] }),
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  const deletePipeline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_pipelines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      toast.success('Đã xóa pipeline');
    },
    onError: (e: Error) => toast.error(`Lỗi xóa: ${e.message}`),
  });

  const retryPipeline = useMutation({
    mutationFn: async (id: string) => {
      // Reset pipeline: clear flag, reset to strategy stage, clear completed_at
      const { error } = await supabase
        .from('agent_pipelines')
        .update({
          is_flagged: false,
          flag_reason: null,
          current_stage: 'strategy' as any,
          completed_at: null,
          stage_started_at: new Date().toISOString(),
          pipeline_state: { stages: {} },
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;

      // Trigger the orchestrator to pick it up again
      const { error: invokeError } = await supabase.functions.invoke('agent-pipeline', {
        body: { action: 'advance_stage', pipeline_id: id },
      });
      if (invokeError) console.warn('Retry invoke warning:', invokeError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      toast.success('Đang chạy lại pipeline...');
    },
    onError: (e: Error) => toast.error(`Lỗi retry: ${e.message}`),
  });

  return {
    pipelines: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    updateStage,
    deletePipeline,
    retryPipeline,
  };
}
