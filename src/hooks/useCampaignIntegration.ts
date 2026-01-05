import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { isToday, isFuture, isPast, parseISO, differenceInDays, startOfDay, endOfDay, addDays } from 'date-fns';

export interface CampaignMilestone {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
  completed_at: string | null;
  sort_order: number | null;
  created_at: string | null;
  campaign_name?: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
  campaign_type: string;
  description: string | null;
  thumbnail_url: string | null;
  goals: any;
  milestones_completed: number;
  milestones_total: number;
  content_count: number;
  kpi_progress: number;
  days_remaining: number;
}

export interface CampaignContentMapping {
  content_id: string;
  campaign_id: string;
  campaign_name: string;
}

export interface CampaignIntegrationStats {
  activeCampaigns: number;
  upcomingMilestones: number;
  overdueMilestones: number;
  avgKPIProgress: number;
}

export function useCampaignIntegration() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;

  // Fetch active/planning campaigns with details
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns-integration', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['active', 'planning'])
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch all milestones for active campaigns
  const campaignIds = campaigns.map(c => c.id);
  
  const { data: milestones = [], isLoading: loadingMilestones } = useQuery({
    queryKey: ['milestones-integration', campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];

      const { data, error } = await supabase
        .from('campaign_milestones')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });

  // Fetch campaign contents mapping
  const { data: campaignContents = [], isLoading: loadingContents } = useQuery({
    queryKey: ['campaign-contents-integration', campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];

      const { data, error } = await supabase
        .from('campaign_contents')
        .select('*')
        .in('campaign_id', campaignIds);

      if (error) throw error;
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });

  // Fetch KPI logs for progress calculation
  const { data: kpiLogs = [], isLoading: loadingKPIs } = useQuery({
    queryKey: ['kpi-logs-integration', campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];

      const { data, error } = await supabase
        .from('campaign_kpi_logs')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('logged_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });

  // Process campaigns with summary data
  const campaignSummaries: CampaignSummary[] = useMemo(() => {
    return campaigns.map(campaign => {
      const campaignMilestones = milestones.filter(m => m.campaign_id === campaign.id);
      const completedMilestones = campaignMilestones.filter(m => m.status === 'completed').length;
      const totalMilestones = campaignMilestones.length;
      
      const contentCount = campaignContents.filter(cc => cc.campaign_id === campaign.id).length;
      
      // Calculate KPI progress from latest log
      const campaignKPIs = kpiLogs.filter(log => log.campaign_id === campaign.id);
      const latestKPI = campaignKPIs[0];
      let kpiProgress = 0;
      
      if (latestKPI && campaign.goals) {
        const goals = Array.isArray(campaign.goals) ? campaign.goals : [];
        if (goals.length > 0) {
          const metrics = latestKPI.metrics as Record<string, number>;
          let totalProgress = 0;
          let goalCount = 0;
          
          goals.forEach((goal: any) => {
            const current = metrics[goal.metric] || 0;
            const target = goal.target || 1;
            totalProgress += Math.min((current / target) * 100, 100);
            goalCount++;
          });
          
          kpiProgress = goalCount > 0 ? Math.round(totalProgress / goalCount) : 0;
        }
      }
      
      const daysRemaining = differenceInDays(parseISO(campaign.end_date), new Date());
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        campaign_type: campaign.campaign_type,
        description: campaign.description,
        thumbnail_url: campaign.thumbnail_url,
        goals: campaign.goals,
        milestones_completed: completedMilestones,
        milestones_total: totalMilestones,
        content_count: contentCount,
        kpi_progress: kpiProgress,
        days_remaining: daysRemaining,
      };
    });
  }, [campaigns, milestones, campaignContents, kpiLogs]);

  // Get upcoming milestones (next 7 days)
  const upcomingMilestones: CampaignMilestone[] = useMemo(() => {
    const today = startOfDay(new Date());
    const weekLater = endOfDay(addDays(today, 7));
    
    return milestones
      .filter(m => {
        if (m.status === 'completed') return false;
        const dueDate = parseISO(m.due_date);
        return dueDate >= today && dueDate <= weekLater;
      })
      .map(m => {
        const campaign = campaigns.find(c => c.id === m.campaign_id);
        return {
          ...m,
          status: m.status as CampaignMilestone['status'],
          campaign_name: campaign?.name,
        };
      })
      .slice(0, 5);
  }, [milestones, campaigns]);

  // Get today's milestones
  const todayMilestones: CampaignMilestone[] = useMemo(() => {
    return milestones
      .filter(m => m.status !== 'completed' && isToday(parseISO(m.due_date)))
      .map(m => {
        const campaign = campaigns.find(c => c.id === m.campaign_id);
        return {
          ...m,
          status: m.status as CampaignMilestone['status'],
          campaign_name: campaign?.name,
        };
      });
  }, [milestones, campaigns]);

  // Get overdue milestones
  const overdueMilestones: CampaignMilestone[] = useMemo(() => {
    return milestones
      .filter(m => {
        if (m.status === 'completed' || m.status === 'missed') return false;
        return isPast(parseISO(m.due_date)) && !isToday(parseISO(m.due_date));
      })
      .map(m => {
        const campaign = campaigns.find(c => c.id === m.campaign_id);
        return {
          ...m,
          status: m.status as CampaignMilestone['status'],
          campaign_name: campaign?.name,
        };
      });
  }, [milestones, campaigns]);

  // Content to campaign mapping
  const contentCampaignMapping: CampaignContentMapping[] = useMemo(() => {
    return campaignContents.map(cc => {
      const campaign = campaigns.find(c => c.id === cc.campaign_id);
      return {
        content_id: cc.content_id,
        campaign_id: cc.campaign_id,
        campaign_name: campaign?.name || '',
      };
    });
  }, [campaignContents, campaigns]);

  // Get campaign for a specific content
  const getCampaignForContent = (contentId: string): CampaignContentMapping | undefined => {
    return contentCampaignMapping.find(m => m.content_id === contentId);
  };

  // Stats for dashboard
  const stats: CampaignIntegrationStats = useMemo(() => {
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const upcomingCount = upcomingMilestones.length;
    const overdueCount = overdueMilestones.length;
    
    const avgKPI = campaignSummaries.length > 0
      ? Math.round(campaignSummaries.reduce((sum, c) => sum + c.kpi_progress, 0) / campaignSummaries.length)
      : 0;
    
    return {
      activeCampaigns,
      upcomingMilestones: upcomingCount,
      overdueMilestones: overdueCount,
      avgKPIProgress: avgKPI,
    };
  }, [campaigns, upcomingMilestones, overdueMilestones, campaignSummaries]);

  return {
    // Data
    campaigns: campaignSummaries,
    activeCampaigns: campaignSummaries.filter(c => c.status === 'active'),
    milestones,
    upcomingMilestones,
    todayMilestones,
    overdueMilestones,
    contentCampaignMapping,
    stats,
    
    // Helpers
    getCampaignForContent,
    
    // Loading state
    isLoading: loadingCampaigns || loadingMilestones || loadingContents || loadingKPIs,
  };
}
