import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { 
  Campaign, 
  CampaignFormData, 
  CampaignMilestone, 
  CampaignContent,
  MilestoneFormData,
  CampaignGoal,
  CampaignStatus,
  CampaignContentBrief
} from '@/types/campaign';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely parse goals from JSON
function parseGoals(goals: Json | null): CampaignGoal[] {
  if (!goals || !Array.isArray(goals)) return [];
  return goals as unknown as CampaignGoal[];
}

// Helper to convert CampaignGoal[] to Json
function goalsToJson(goals: CampaignGoal[]): Json {
  return goals as unknown as Json;
}

// Helper to safely parse content_brief from JSON
function parseContentBrief(brief: Json | null): CampaignContentBrief | null {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) return null;
  return brief as unknown as CampaignContentBrief;
}

export function useCampaigns() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // Fetch all campaigns
  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ['campaigns', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(campaign => ({
        ...campaign,
        goals: parseGoals(campaign.goals),
        target_channels: campaign.target_channels || [],
        tags: campaign.tags || [],
        content_brief: parseContentBrief(campaign.content_brief),
      })) as Campaign[];
    },
    enabled: !!orgId,
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async (formData: CampaignFormData) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          organization_id: orgId,
          name: formData.name,
          description: formData.description || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          campaign_type: formData.campaign_type,
          brand_template_id: formData.brand_template_id || null,
          goals: goalsToJson(formData.goals || []),
          budget_total: formData.budget_total || null,
          budget_currency: formData.budget_currency || 'VND',
          target_channels: formData.target_channels || [],
          tags: formData.tags || [],
          content_brief: formData.content_brief ? (formData.content_brief as unknown as Json) : null,
          created_by: userData.user?.id || null,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        goals: parseGoals(data.goals),
        target_channels: data.target_channels || [],
        tags: data.tags || [],
        content_brief: parseContentBrief(data.content_brief),
      } as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Đã tạo chiến dịch mới');
    },
    onError: (error) => {
      console.error('Create campaign error:', error);
      toast.error('Không thể tạo chiến dịch');
    },
  });

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<CampaignFormData> }) => {
      const updatePayload: Record<string, unknown> = { ...updateData };
      if (updateData.goals) {
        updatePayload.goals = goalsToJson(updateData.goals);
      }
      if (updateData.content_brief !== undefined) {
        updatePayload.content_brief = updateData.content_brief ? (updateData.content_brief as unknown as Json) : null;
      }
      
      const { data, error } = await supabase
        .from('campaigns')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        goals: parseGoals(data.goals),
        target_channels: data.target_channels || [],
        tags: data.tags || [],
        content_brief: parseContentBrief(data.content_brief),
      } as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Đã cập nhật chiến dịch');
    },
    onError: (error) => {
      console.error('Update campaign error:', error);
      toast.error('Không thể cập nhật chiến dịch');
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Đã xóa chiến dịch');
    },
    onError: (error) => {
      console.error('Delete campaign error:', error);
      toast.error('Không thể xóa chiến dịch');
    },
  });

  // Update campaign status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        goals: parseGoals(data.goals),
        target_channels: data.target_channels || [],
        tags: data.tags || [],
        content_brief: parseContentBrief(data.content_brief),
      } as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Đã cập nhật trạng thái');
    },
    onError: (error) => {
      console.error('Update status error:', error);
      toast.error('Không thể cập nhật trạng thái');
    },
  });

  // Update budget spent
  const updateBudgetSpentMutation = useMutation({
    mutationFn: async ({ id, budgetSpent }: { id: string; budgetSpent: number }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ budget_spent: budgetSpent })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        goals: parseGoals(data.goals),
        target_channels: data.target_channels || [],
        tags: data.tags || [],
        content_brief: parseContentBrief(data.content_brief),
      } as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      toast.success('Đã cập nhật chi tiêu');
    },
    onError: (error) => {
      console.error('Update budget spent error:', error);
      toast.error('Không thể cập nhật chi tiêu');
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    refetch,
    createCampaign: createMutation.mutateAsync,
    updateCampaign: updateMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    updateBudgetSpent: updateBudgetSpentMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single campaign with details
export function useCampaignDetail(campaignId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: campaignData, isLoading, error } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          brand_template:brand_templates (
            id,
            industry
          )
        `)
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      
      const brandTemplate = data.brand_template as { id: string; industry: string[] | null } | null;
      
      return {
        campaign: {
          ...data,
          goals: parseGoals(data.goals),
          target_channels: data.target_channels || [],
          tags: data.tags || [],
          content_brief: parseContentBrief(data.content_brief),
        } as Campaign,
        industries: brandTemplate?.industry ?? null,
      };
    },
    enabled: !!campaignId,
  });

  const campaign = campaignData?.campaign ?? null;
  const industries = campaignData?.industries ?? null;

  // Fetch milestones
  const { data: milestones = [] } = useQuery({
    queryKey: ['campaign-milestones', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_milestones')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as CampaignMilestone[];
    },
    enabled: !!campaignId,
  });

  // Fetch contents
  const { data: contents = [] } = useQuery({
    queryKey: ['campaign-contents', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_contents')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('planned_publish_date', { ascending: true });
      
      if (error) throw error;
      return data as CampaignContent[];
    },
    enabled: !!campaignId,
  });

  // Fetch KPI logs
  const { data: kpiLogs = [] } = useQuery({
    queryKey: ['campaign-kpi-logs', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_kpi_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('logged_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as import('@/types/campaign').CampaignKPILog[];
    },
    enabled: !!campaignId,
  });

  // Add milestone mutation
  const addMilestoneMutation = useMutation({
    mutationFn: async (milestone: MilestoneFormData) => {
      if (!campaignId) throw new Error('No campaign');
      
      const { data, error } = await supabase
        .from('campaign_milestones')
        .insert({
          campaign_id: campaignId,
          title: milestone.title,
          description: milestone.description || null,
          due_date: milestone.due_date,
          status: milestone.status || 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as CampaignMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-milestones', campaignId] });
      toast.success('Đã thêm milestone');
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; description?: string; due_date?: string; status?: string; completed_at?: string | null }) => {
      const { id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('campaign_milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result as CampaignMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-milestones', campaignId] });
      toast.success('Đã cập nhật milestone');
    },
  });

  // Delete milestone mutation
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_milestones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-milestones', campaignId] });
      toast.success('Đã xóa milestone');
    },
  });

  // Update KPIs mutation
  const updateKPIsMutation = useMutation({
    mutationFn: async (goals: CampaignGoal[]) => {
      if (!campaignId) throw new Error('No campaign');
      
      const { data, error } = await supabase
        .from('campaigns')
        .update({ goals: goalsToJson(goals) })
        .eq('id', campaignId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        goals: parseGoals(data.goals),
        target_channels: data.target_channels || [],
        tags: data.tags || [],
        content_brief: parseContentBrief(data.content_brief),
      } as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Đã cập nhật KPIs');
    },
  });

  // Link content mutation
  const linkContentMutation = useMutation({
    mutationFn: async (data: { content_type: string; content_id: string; planned_publish_date?: string; notes?: string }) => {
      if (!campaignId) throw new Error('No campaign');
      
      const { data: result, error } = await supabase
        .from('campaign_contents')
        .insert({
          campaign_id: campaignId,
          content_type: data.content_type,
          content_id: data.content_id,
          planned_publish_date: data.planned_publish_date || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result as CampaignContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contents', campaignId] });
      toast.success('Đã liên kết nội dung');
    },
  });

  // Unlink content mutation
  const unlinkContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_contents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contents', campaignId] });
      toast.success('Đã hủy liên kết nội dung');
    },
  });

  // Add KPI log mutation
  const addKPILogMutation = useMutation({
    mutationFn: async (data: { logged_at: string; metrics: Record<string, number>; notes?: string }) => {
      if (!campaignId) throw new Error('No campaign');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('campaign_kpi_logs')
        .insert({
          campaign_id: campaignId,
          logged_at: data.logged_at,
          metrics: data.metrics as unknown as Json,
          notes: data.notes || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-kpi-logs', campaignId] });
      toast.success('Đã ghi nhận KPI');
    },
  });

  return {
    campaign,
    industries,
    milestones,
    contents,
    kpiLogs,
    isLoading,
    error,
    addMilestone: addMilestoneMutation.mutateAsync,
    updateMilestone: updateMilestoneMutation.mutateAsync,
    deleteMilestone: deleteMilestoneMutation.mutateAsync,
    updateKPIs: updateKPIsMutation.mutateAsync,
    linkContent: linkContentMutation.mutateAsync,
    unlinkContent: unlinkContentMutation.mutateAsync,
    addKPILog: addKPILogMutation.mutateAsync,
  };
}
