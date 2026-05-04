// Batch refresh all Wix OAuth tokens that are close to expiry.
// Called by pg_cron every 30 minutes.
// Wix access tokens TTL ~5 min; refresh tokens are long-lived. We refresh any
// connection where token_expires_at is null or <= now + 10 min.
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(withPerf({ functionName: 'refresh-all-wix-tokens' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = getServiceClient();
  // Refresh anything expiring in the next 10 minutes (or unknown expiry)
  const cutoff = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from('social_connections')
    .select('id, account_name, token_expires_at, refresh_token, metadata')
    .eq('platform', 'website')
    .eq('is_active', true)
    .not('refresh_token', 'is', null)
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);

  if (error) {
    console.error('[refresh-all-wix] query failed', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Filter for Wix OAuth integrations only (platform='website' covers multiple integrations)
  const wixConnections = (connections || []).filter((c: any) => {
    const integrationType = c?.metadata?.integration_type;
    return integrationType === 'wix_oauth';
  });

  console.log(`[refresh-all-wix] processing ${wixConnections.length} Wix OAuth connections`);
  const results: any[] = [];

  for (const conn of wixConnections) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/refresh-wix-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id }),
      });
      const json = await res.json().catch(() => ({}));
      results.push({
        id: conn.id,
        account: conn.account_name,
        success: res.ok && !json.error,
        error: json.error,
      });
    } catch (e: any) {
      results.push({ id: conn.id, account: conn.account_name, success: false, error: e.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  console.log(`[refresh-all-wix] done: ${succeeded}/${results.length} refreshed`);

  return new Response(
    JSON.stringify({ success: true, total: results.length, succeeded, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
