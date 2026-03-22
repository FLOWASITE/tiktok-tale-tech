import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

interface SyncRequest {
  syncConfigId?: string;
  adCopyId?: string;
  forceSync?: boolean;
}

Deno.Deno.serve(withPerf({ functionName: 'sync-ad-performance' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check (optional for cron jobs)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    const body: SyncRequest = await req.json().catch(() => ({}));
    
    console.log('[sync-ad-performance] Starting sync...', body);

    let syncConfigs: any[] = [];

    if (body.syncConfigId) {
      // Sync specific config
      const { data, error } = await supabase
        .from('ad_sync_configs')
        .select(`
          *,
          social_connections (*)
        `)
        .eq('id', body.syncConfigId)
        .single();

      if (error) throw error;
      if (data) syncConfigs = [data];
    } else if (body.adCopyId) {
      // Sync all configs for an ad copy
      const { data, error } = await supabase
        .from('ad_sync_configs')
        .select(`
          *,
          social_connections (*)
        `)
        .eq('ad_copy_id', body.adCopyId)
        .eq('sync_enabled', true);

      if (error) throw error;
      syncConfigs = data || [];
    } else {
      // Batch sync: get all due configs
      const { data, error } = await supabase
        .from('ad_sync_configs')
        .select(`
          *,
          social_connections (*)
        `)
        .eq('sync_enabled', true)
        .neq('sync_frequency', 'manual')
        .or(`next_sync_at.is.null,next_sync_at.lte.${new Date().toISOString()}`);

      if (error) throw error;
      syncConfigs = data || [];
    }

    console.log(`[sync-ad-performance] Found ${syncConfigs.length} configs to sync`);

    if (syncConfigs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Không có cấu hình cần đồng bộ', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    for (const config of syncConfigs) {
      try {
        const result = await syncSingleConfig(supabase, config);
        results.push({ configId: config.id, ...result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[sync-ad-performance] Error syncing config ${config.id}:`, error);
        results.push({ configId: config.id, success: false, error: message });

        // Update sync status to error
        await supabase
          .from('ad_sync_configs')
          .update({
            sync_status: 'error',
            last_error: message,
          })
          .eq('id', config.id);
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Đã đồng bộ ${successCount}/${results.length} cấu hình`,
        synced: successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[sync-ad-performance] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

async function syncSingleConfig(supabase: any, config: any) {
  const connection = config.social_connections;
  
  if (!connection || !connection.is_active) {
    throw new Error('Connection không hoạt động');
  }

  console.log(`[sync-ad-performance] Syncing config ${config.id}, ad ${config.external_ad_id}`);

  // Update status to syncing
  await supabase
    .from('ad_sync_configs')
    .update({ sync_status: 'syncing' })
    .eq('id', config.id);

  // Fetch insights from Meta API
  const fields = [
    'impressions',
    'reach',
    'clicks',
    'spend',
    'ctr',
    'cpc',
    'cpm',
    'actions',
    'cost_per_action_type',
    'conversions',
    'conversion_values',
    'purchase_roas',
    'date_start',
    'date_stop',
  ].join(',');

  // Get today's data
  const today = new Date().toISOString().split('T')[0];
  const url = `${META_GRAPH_API}/${config.external_ad_id}/insights?fields=${fields}&date_preset=today&access_token=${connection.access_token}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Meta API error');
  }

  if (!data.data || data.data.length === 0) {
    // No data for today, update sync status
    const nextSyncAt = calculateNextSync(config.sync_frequency);
    await supabase
      .from('ad_sync_configs')
      .update({
        sync_status: 'success',
        last_synced_at: new Date().toISOString(),
        next_sync_at: nextSyncAt,
        last_error: null,
      })
      .eq('id', config.id);

    return { success: true, message: 'Không có dữ liệu mới', hasData: false };
  }

  const insights = data.data[0];
  const parsed = parseInsights(insights);

  // Upsert performance data
  const { error: upsertError } = await supabase
    .from('ad_copy_performance')
    .upsert({
      ad_copy_id: config.ad_copy_id,
      logged_at: today,
      sync_config_id: config.id,
      synced_at: new Date().toISOString(),
      external_ad_id: config.external_ad_id,
      data_source: 'api',
      raw_api_response: insights,
      ...parsed,
    }, {
      onConflict: 'ad_copy_id,logged_at',
    });

  if (upsertError) {
    throw upsertError;
  }

  // Update sync config
  const nextSyncAt = calculateNextSync(config.sync_frequency);
  await supabase
    .from('ad_sync_configs')
    .update({
      sync_status: 'success',
      last_synced_at: new Date().toISOString(),
      next_sync_at: nextSyncAt,
      last_error: null,
    })
    .eq('id', config.id);

  console.log(`[sync-ad-performance] Successfully synced config ${config.id}`);

  return { success: true, hasData: true, parsed };
}

function calculateNextSync(frequency: string): string | null {
  const now = new Date();
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

function parseInsights(raw: any) {
  const impressions = parseInt(raw.impressions || '0', 10);
  const reach = parseInt(raw.reach || '0', 10);
  const clicks = parseInt(raw.clicks || '0', 10);
  const spend = parseFloat(raw.spend || '0');

  const actions = raw.actions || [];
  const getActionValue = (types: string[]) => {
    for (const type of types) {
      const action = actions.find((a: any) => a.action_type === type);
      if (action) return parseInt(action.value, 10);
    }
    return 0;
  };

  const likes = getActionValue(['like', 'post_reaction']);
  const comments = getActionValue(['comment']);
  const shares = getActionValue(['post', 'share']);
  const saves = getActionValue(['onsite_conversion.post_save']);
  const leads = getActionValue(['lead', 'leadgen.other']);
  const conversions = getActionValue(['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);

  const conversionValues = raw.conversion_values || [];
  let conversionValue = 0;
  for (const cv of conversionValues) {
    if (['purchase', 'omni_purchase'].includes(cv.action_type)) {
      conversionValue = parseFloat(cv.value);
      break;
    }
  }

  const roasData = raw.purchase_roas || [];
  let roas = 0;
  for (const r of roasData) {
    if (['omni_purchase', 'purchase'].includes(r.action_type)) {
      roas = parseFloat(r.value);
      break;
    }
  }

  const totalEngagement = likes + comments + shares + saves;
  const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

  return {
    impressions,
    reach,
    clicks,
    spend,
    likes,
    comments,
    shares,
    saves,
    leads,
    conversions,
    conversion_value: conversionValue,
    ctr: parseFloat(raw.ctr || '0'),
    cpc: parseFloat(raw.cpc || '0'),
    cpm: parseFloat(raw.cpm || '0'),
    roas,
    engagement_rate: engagementRate,
    conversion_rate: conversionRate,
  };
}
