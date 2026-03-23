import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgentPipelineLog } from '@/types/agent';

export function useAgentPipelineLogs(pipelineId: string | null) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['agent-pipeline-logs', pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_pipeline_logs')
        .select('*')
        .eq('pipeline_id', pipelineId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AgentPipelineLog[];
    },
  });

  return { logs, isLoading };
}
