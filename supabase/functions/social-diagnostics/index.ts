import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Consolidated social diagnostics — single entry point for all connection tests.
 * Routes to the appropriate test function via internal fetch.
 *
 * Body: { action: 'test-connection' | 'test-credentials', platform: 'facebook' | ..., ...payload }
 */

const PLATFORM_NAMES = [
  'facebook', 'instagram', 'linkedin', 'threads',
  'twitter', 'zalo', 'google-business', 'website',
];

function resolveFunctionName(action: string, platform: string): string | null {
  if (!['test-connection', 'test-credentials'].includes(action)) return null;
  if (!PLATFORM_NAMES.includes(platform)) return null;
  return `test-${platform}-${action.replace('test-', '')}`;
}

Deno.serve(withPerf({ functionName: 'social-diagnostics' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, platform, ...payload } = body;

    const functionName = resolveFunctionName(action, platform);
    if (!functionName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid action/platform: ${action}/${platform}. Supported actions: test-connection, test-credentials. Platforms: ${PLATFORM_NAMES.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    console.log(`[social-diagnostics] routing action="${action}" platform="${platform}" → ${functionName}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        apikey: apiKey,
      },
      body: JSON.stringify({ ...payload, platform }),
    });

    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[social-diagnostics] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal routing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
