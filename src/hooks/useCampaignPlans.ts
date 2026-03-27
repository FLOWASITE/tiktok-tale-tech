import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { CampaignContentPlan, CampaignContentPiece } from '@/types/agent';
import { toast } from 'sonner';
import { parseEdgeFunctionError } from '@/lib/edgeFunctionErrors';

export function useCampaignPlans(goalId?: string) {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  const query = useQuery({
    queryKey: ['campaign-plans', orgId, goalId],
    queryFn: async () => {
      if (!orgId) return [];
      let q = supabase
        .from('campaign_content_plans')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (goalId) q = q.eq('goal_id', goalId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CampaignContentPlan[];
    },
    enabled: !!orgId,
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignContentPlan> & { id: string }) => {
      const { error } = await supabase
        .from('campaign_content_plans')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign-plans', orgId] }),
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  const approvePlan = useMutation({
    mutationFn: async (planId: string) => {
      // Mark plan as approved
      const { error: updateErr } = await supabase
        .from('campaign_content_plans')
        .update({
          plan_approved: true,
          plan_approved_at: new Date().toISOString(),
          status: 'approved',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', planId);
      if (updateErr) throw updateErr;

      // Trigger pipeline creation via edge function
      const { data, error } = await supabase.functions.invoke('agent-pipeline', {
        body: { action: 'create_from_plan', plan_id: planId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-plans', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-pipelines', orgId] });
      toast.success(`Đã tạo ${data?.pipeline_count || 0} pipeline từ kế hoạch`);
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  const regeneratePlan = useMutation({
    mutationFn: async (params: {
      plan_id: string;
      goal_id: string;
      campaign_title: string;
      campaign_description?: string;
      target_channels: string[];
      campaign_duration_days: number;
      campaign_start_date: string;
      approval_mode: string;
      brand_template_id?: string;
      clarification_context?: Record<string, any> | null;
      organization_id: string;
    }) => {
      // Delete old plan
      await supabase.from('campaign_content_plans').delete().eq('id', params.plan_id);

      // Generate new plan
      const { data, error } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          goal_id: params.goal_id,
          campaign_title: params.campaign_title,
          campaign_description: params.campaign_description,
          target_channels: params.target_channels,
          campaign_duration_days: params.campaign_duration_days,
          campaign_start_date: params.campaign_start_date,
          approval_mode: params.approval_mode,
          brand_template_id: params.brand_template_id,
          clarification_context: params.clarification_context,
          organization_id: params.organization_id,
        },
      });
      if (error) {
        const parsedError = parseEdgeFunctionError(error, 'Không thể tạo kế hoạch mới');
        throw new Error(parsedError.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-plans', orgId] });
      toast.success('Đã tạo kế hoạch mới');
    },
    onError: (e: Error) => toast.error(`Lỗi: ${e.message}`),
  });

  return {
    plans: query.data || [],
    isLoading: query.isLoading,
    updatePlan,
    approvePlan,
    regeneratePlan,
    refetch: query.refetch,
  };
}
