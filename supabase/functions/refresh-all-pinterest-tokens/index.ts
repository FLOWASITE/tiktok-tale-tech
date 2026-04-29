// Batch refresh all Pinterest tokens that expire within 7 days.
// Called by pg_cron every 30 minutes.
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(withPerf({ functionName: 'refresh-all-pinterest-tokens' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = getServiceClient();
  // Pinterest tokens expire after 30 days; refresh anything expiring < 7 days
  const cutoff = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from('social_connections')
    .select('id, account_name, token_expires_at, refresh_token')
    .eq('platform', 'pinterest')
    .eq('is_active', true)
    .not('refresh_token', 'is', null)
    .or(`token_expires_at.is.null,token_expires_at.lte.${cutoff}`);

  if (error) {
    console.error('[refresh-all-pinterest] query failed', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[refresh-all-pinterest] processing ${connections?.length || 0} connections`);
  const results: any[] = [];

  for (const conn of connections || []) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/refresh-pinterest-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: conn.id }),
      });
      const json = await res.json();
      results.push({ id: conn.id, account: conn.account_name, success: json.success, error: json.error });
    } catch (e: any) {
      results.push({ id: conn.id, account: conn.account_name, success: false, error: e.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  console.log(`[refresh-all-pinterest] done: ${succeeded}/${results.length} refreshed`);

  return new Response(
    JSON.stringify({ success: true, total: results.length, succeeded, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
