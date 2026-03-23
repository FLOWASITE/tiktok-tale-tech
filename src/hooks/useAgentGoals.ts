import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { AgentGoal, AgentAutonomyLevel } from '@/types/agent';
import { toast } from 'sonner';

export function useAgentGoals() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['agent-goals', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AgentGoal[];
    },
    enabled: !!orgId,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: {
      name: string;
      description?: string;
      target_topics: string[];
      target_channels: string[];
      frequency: Record<string, string>;
      autonomy_level: AgentAutonomyLevel;
      brand_template_id?: string;
      campaign_id?: string;
    }) => {
      if (!orgId) throw new Error('No organization');
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('agent_goals')
        .insert({
          ...goal,
          organization_id: orgId,
          created_by: user?.id,
          campaign_id: goal.campaign_id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', orgId] });
      toast.success('Đã tạo campaign mới');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgentGoal> & { id: string }) => {
      const { error } = await supabase
        .from('agent_goals')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-goals', orgId] }),
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', orgId] });
      toast.success('Đã xóa campaign');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  return {
    goals: query.data || [],
    isLoading: query.isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
