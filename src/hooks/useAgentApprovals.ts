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
      // Fetch pending + recent 30 days of reviewed approvals
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('agent_approvals')
        .select('*')
        .eq('organization_id', orgId)
        .or(`status.eq.pending,created_at.gte.${thirtyDaysAgo}`)
        .order('created_at', { ascending: false })
        .limit(200);
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
    mutationFn: async ({ id, status, notes, scheduled_publish_at }: { id: string; status: AgentApprovalStatus; notes?: string; scheduled_publish_at?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Call agent-approve edge function to properly advance pipeline
      const { data, error } = await supabase.functions.invoke('agent-approve', {
        body: {
          approval_id: id,
          action: status === 'approved' ? 'approve' : 'reject',
          notes: notes || null,
          reviewer_id: user?.id,
          scheduled_publish_at: scheduled_publish_at !== undefined ? scheduled_publish_at : undefined,
        },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || 'Lỗi không xác định');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      if (data?.already_decided) {
        toast.info(data.message || 'Yêu cầu đã được xử lý trước đó');
        return;
      }
      const msg = vars.status === 'approved' ? 'Đã duyệt — pipeline tiếp tục' : vars.status === 'rejected' ? 'Đã từ chối — trả về sáng tạo' : 'Đã cập nhật';
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
