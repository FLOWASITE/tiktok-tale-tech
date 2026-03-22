import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

interface FetchInsightsRequest {
  connectionId: string;
  externalAdId: string;
  datePreset?: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'lifetime';
  dateRange?: {
    since: string;
    until: string;
  };
}

Deno.Deno.serve(withPerf({ functionName: 'fetch-meta-ad-insights' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: FetchInsightsRequest = await req.json();

    if (!body.connectionId || !body.externalAdId) {
      return new Response(
        JSON.stringify({ error: 'connectionId và externalAdId là bắt buộc' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fetch-meta-ad-insights] Fetching insights for ad ${body.externalAdId}`);

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', body.connectionId)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Connection không tồn tại' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connection.is_active) {
      return new Response(
        JSON.stringify({ error: 'Connection không hoạt động' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build insights URL
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

    let url = `${META_GRAPH_API}/${body.externalAdId}/insights?fields=${fields}&access_token=${connection.access_token}`;

    // Add date parameters
    if (body.dateRange) {
      url += `&time_range={"since":"${body.dateRange.since}","until":"${body.dateRange.until}"}`;
    } else if (body.datePreset) {
      url += `&date_preset=${body.datePreset}`;
    } else {
      // Default to last 7 days
      url += '&date_preset=last_7d';
    }

    console.log(`[fetch-meta-ad-insights] Calling Meta API...`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('[fetch-meta-ad-insights] Meta API error:', data.error);
      return new Response(
        JSON.stringify({ 
          error: data.error.message || 'Meta API error',
          code: data.error.code,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          insights: null,
          message: 'Không có dữ liệu insights cho khoảng thời gian này',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the first (or aggregated) result
    const insights = data.data[0];

    // Parse insights into our format
    const parsed = parseInsights(insights);

    console.log(`[fetch-meta-ad-insights] Successfully fetched insights`);

    return new Response(
      JSON.stringify({ 
        success: true,
        insights: parsed,
        raw: insights,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[fetch-meta-ad-insights] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));

function parseInsights(raw: any) {
  const impressions = parseInt(raw.impressions || '0', 10);
  const reach = parseInt(raw.reach || '0', 10);
  const clicks = parseInt(raw.clicks || '0', 10);
  const spend = parseFloat(raw.spend || '0');

  // Parse actions
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

  // Parse conversion values
  const conversionValues = raw.conversion_values || [];
  let conversionValue = 0;
  for (const cv of conversionValues) {
    if (['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'].includes(cv.action_type)) {
      conversionValue = parseFloat(cv.value);
      break;
    }
  }

  // Parse ROAS
  const roasData = raw.purchase_roas || [];
  let roas = 0;
  for (const r of roasData) {
    if (['omni_purchase', 'purchase'].includes(r.action_type)) {
      roas = parseFloat(r.value);
      break;
    }
  }

  // Calculate engagement rate
  const totalEngagement = likes + comments + shares + saves;
  const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;

  // Calculate conversion rate
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
    date_start: raw.date_start,
    date_stop: raw.date_stop,
  };
}
