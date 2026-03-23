import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { AgentApproval, AgentApprovalStatus } from '@/types/agent';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useAgentApprovals() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['agent-approvals', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('agent_approvals')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AgentApproval[];
    },
    enabled: !!orgId,
  });

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`agent-approvals-${orgId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agent_approvals',
        filter: `organization_id=eq.${orgId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['agent-approvals', orgId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  const pendingCount = (query.data || []).filter(a => a.status === 'pending').length;

  const updateApproval = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: AgentApprovalStatus; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('agent_approvals')
        .update({
          status,
          reviewer_id: user?.id,
          reviewer_notes: notes || null,
          decided_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      const msg = vars.status === 'approved' ? 'Đã duyệt' : vars.status === 'rejected' ? 'Đã từ chối' : 'Đã cập nhật';
      toast.success(msg);
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  return {
    approvals: query.data || [],
    pendingCount,
    isLoading: query.isLoading,
    updateApproval,
  };
}
