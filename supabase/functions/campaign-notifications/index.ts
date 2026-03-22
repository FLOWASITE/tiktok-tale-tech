import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignGoal {
  metric: string;
  label?: string;
  target: number;
  current: number;
}

Deno.Deno.serve(withPerf({ functionName: 'campaign-notifications' }, async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Calculate dates for 1 day and 3 days from now
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    console.log(`[campaign-notifications] Running check for dates: tomorrow=${tomorrowStr}, in3Days=${in3DaysStr}`);

    // Get existing notification keys to avoid duplicates
    const { data: existingLogs } = await supabase
      .from('campaign_notification_logs')
      .select('notification_key');
    
    const existingKeys = new Set((existingLogs || []).map(l => l.notification_key));
    
    const notificationsToInsert: Array<{
      user_id: string;
      organization_id: string;
      type: string;
      title: string;
      message: string;
      data: Record<string, unknown>;
    }> = [];
    
    const logsToInsert: Array<{
      campaign_id: string;
      notification_key: string;
      notification_type: string;
    }> = [];

    // 1. Check milestones due in 1 or 3 days
    const { data: upcomingMilestones, error: milestonesError } = await supabase
      .from('campaign_milestones')
      .select(`
        id,
        title,
        due_date,
        status,
        campaign_id,
        campaigns!inner(id, name, created_by, organization_id, status)
      `)
      .in('status', ['pending', 'in_progress'])
      .eq('campaigns.status', 'active')
      .or(`due_date.eq.${tomorrowStr},due_date.eq.${in3DaysStr}`);

    if (milestonesError) {
      console.error('[campaign-notifications] Error fetching milestones:', milestonesError);
    } else {
      console.log(`[campaign-notifications] Found ${upcomingMilestones?.length || 0} upcoming milestones`);
      
      for (const milestone of (upcomingMilestones || [])) {
        const campaign = milestone.campaigns as unknown as { id: string; name: string; created_by: string; organization_id: string; status: string };
        const dueDate = new Date(milestone.due_date);
        const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const notificationKey = `milestone_due_${days}_${milestone.id}_${milestone.due_date}`;
        
        if (!existingKeys.has(notificationKey)) {
          notificationsToInsert.push({
            user_id: campaign.created_by,
            organization_id: campaign.organization_id,
            type: 'milestone_due_soon',
            title: `Milestone còn ${days} ngày`,
            message: `"${milestone.title}" trong chiến dịch "${campaign.name}"`,
            data: {
              campaign_id: milestone.campaign_id,
              milestone_id: milestone.id,
              milestone_title: milestone.title,
              days
            }
          });
          
          logsToInsert.push({
            campaign_id: milestone.campaign_id,
            notification_key: notificationKey,
            notification_type: 'milestone_due_soon'
          });
          
          existingKeys.add(notificationKey);
        }
      }
    }

    // 2. Check campaigns ending in 1 or 3 days
    const { data: endingCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, end_date, created_by, organization_id')
      .eq('status', 'active')
      .or(`end_date.eq.${tomorrowStr},end_date.eq.${in3DaysStr}`);

    if (campaignsError) {
      console.error('[campaign-notifications] Error fetching ending campaigns:', campaignsError);
    } else {
      console.log(`[campaign-notifications] Found ${endingCampaigns?.length || 0} campaigns ending soon`);
      
      for (const campaign of (endingCampaigns || [])) {
        const endDate = new Date(campaign.end_date);
        const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const notificationKey = `campaign_ending_${days}_${campaign.id}_${campaign.end_date}`;
        
        if (!existingKeys.has(notificationKey)) {
          notificationsToInsert.push({
            user_id: campaign.created_by,
            organization_id: campaign.organization_id,
            type: 'campaign_ending_soon',
            title: `Chiến dịch sắp kết thúc`,
            message: `"${campaign.name}" sẽ kết thúc trong ${days} ngày`,
            data: {
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              days
            }
          });
          
          logsToInsert.push({
            campaign_id: campaign.id,
            notification_key: notificationKey,
            notification_type: 'campaign_ending_soon'
          });
          
          existingKeys.add(notificationKey);
        }
      }
    }

    // 3. Check KPI targets (for campaigns where goals have current >= target)
    const { data: activeCampaigns, error: kpiError } = await supabase
      .from('campaigns')
      .select('id, name, goals, created_by, organization_id')
      .eq('status', 'active')
      .not('goals', 'is', null);

    if (kpiError) {
      console.error('[campaign-notifications] Error fetching campaigns for KPI check:', kpiError);
    } else {
      console.log(`[campaign-notifications] Checking KPIs for ${activeCampaigns?.length || 0} campaigns`);
      
      for (const campaign of (activeCampaigns || [])) {
        const goals = campaign.goals as CampaignGoal[] | null;
        if (!goals || !Array.isArray(goals)) continue;
        
        for (const goal of goals) {
          if (goal.current >= goal.target && goal.target > 0) {
            const notificationKey = `kpi_reached_${goal.metric}_${campaign.id}`;
            
            if (!existingKeys.has(notificationKey)) {
              const isExceeded = goal.current > goal.target;
              const percentOver = isExceeded 
                ? Math.round(((goal.current - goal.target) / goal.target) * 100)
                : 0;
              
              notificationsToInsert.push({
                user_id: campaign.created_by,
                organization_id: campaign.organization_id,
                type: isExceeded ? 'kpi_target_exceeded' : 'kpi_target_reached',
                title: isExceeded ? 'Vượt mục tiêu KPI!' : 'Đạt mục tiêu KPI!',
                message: isExceeded 
                  ? `${campaign.name}: ${goal.label || goal.metric} vượt ${percentOver}% target`
                  : `${campaign.name}: ${goal.label || goal.metric} đạt ${goal.current}/${goal.target}`,
                data: {
                  campaign_id: campaign.id,
                  campaign_name: campaign.name,
                  metric: goal.metric,
                  label: goal.label,
                  target: goal.target,
                  current: goal.current
                }
              });
              
              logsToInsert.push({
                campaign_id: campaign.id,
                notification_key: notificationKey,
                notification_type: isExceeded ? 'kpi_target_exceeded' : 'kpi_target_reached'
              });
              
              existingKeys.add(notificationKey);
            }
          }
        }
      }
    }

    // Insert notifications
    if (notificationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      
      if (insertError) {
        console.error('[campaign-notifications] Error inserting notifications:', insertError);
      } else {
        console.log(`[campaign-notifications] Inserted ${notificationsToInsert.length} notifications`);
      }
    }

    // Insert logs to prevent duplicates
    if (logsToInsert.length > 0) {
      const { error: logError } = await supabase
        .from('campaign_notification_logs')
        .insert(logsToInsert);
      
      if (logError) {
        console.error('[campaign-notifications] Error inserting notification logs:', logError);
      } else {
        console.log(`[campaign-notifications] Inserted ${logsToInsert.length} notification logs`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notificationsToInsert.length,
        checked_at: now.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[campaign-notifications] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}));
