import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Top user-facing functions to keep warm
const WARM_UP_TARGETS = [
  'generate-multichannel',
  'chat-conversations',
  'chat-topics',
  'topic-ai',
  'generate-core-content',
  'help-chatbot',
  'channel-publisher',
  'auth-gateway',
];

Deno.serve(withPerf({ functionName: 'warm-up-functions' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const results: Record<string, { status: number; durationMs: number }> = {};

  // Ping each function with OPTIONS (lightweight, no auth needed)
  const promises = WARM_UP_TARGETS.map(async (fnName) => {
    const start = performance.now();
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
        },
      });
      results[fnName] = {
        status: res.status,
        durationMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      results[fnName] = {
        status: 0,
        durationMs: Math.round(performance.now() - start),
      };
    }
  });

  await Promise.all(promises);

  // Also refresh compliance materialized view periodically
  try {
    const supabase = getServiceClient();
    await supabase.rpc('refresh_compliance_rules_mv');
    console.log('[warm-up] Compliance MV refreshed');
  } catch (err) {
    console.warn('[warm-up] MV refresh failed:', err);
  }

  console.log('[warm-up] Results:', JSON.stringify(results));

  return new Response(JSON.stringify({ 
    warmed: Object.keys(results).length,
    results,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
