import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Consolidated OAuth callback gateway — single entry point for all social OAuth callbacks.
 * Routes to the appropriate platform-specific function via internal fetch.
 *
 * Body: { platform: 'zalo' | 'facebook' | 'instagram' | ..., ...oauthPayload }
 */

const PLATFORM_FUNCTION_MAP: Record<string, string> = {
  zalo: 'zalo-oauth-callback',
  facebook: 'facebook-oauth-callback',
  instagram: 'instagram-oauth-callback',
  linkedin: 'linkedin-oauth-callback',
  threads: 'threads-oauth-callback',
  tiktok: 'tiktok-oauth-callback',
  'google-business': 'google-business-oauth-callback',
  x: 'x-oauth-callback',
  twitter: 'x-oauth-callback',
};

Deno.serve(withPerf({ functionName: 'auth-gateway' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { platform, ...payload } = body;

    if (!platform || !PLATFORM_FUNCTION_MAP[platform]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid platform: ${platform}. Supported: ${Object.keys(PLATFORM_FUNCTION_MAP).join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const functionName = PLATFORM_FUNCTION_MAP[platform];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    console.log(`[auth-gateway] routing platform="${platform}" → ${functionName}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        apikey: apiKey,
      },
      body: JSON.stringify(payload),
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
    console.error('[auth-gateway] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal routing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
