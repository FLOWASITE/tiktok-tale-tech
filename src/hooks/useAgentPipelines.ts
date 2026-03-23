import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { AgentPipeline, AgentPipelineStage } from '@/types/agent';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAgentPipelines(goalId?: string) {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['agent-pipelines', orgId, goalId],
    queryFn: async () => {
      if (!orgId) return [];
      let q = supabase
        .from('agent_pipelines')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
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

  return {
    pipelines: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    updateStage,
  };
}
