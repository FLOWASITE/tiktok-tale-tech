import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Consolidated channel publisher — single entry point for all social publishing.
 * Routes to the appropriate platform-specific function via internal fetch.
 *
 * Body: { action: 'zalo' | 'facebook' | 'instagram' | ..., ...publishPayload }
 */

const PLATFORM_FUNCTION_MAP: Record<string, string> = {
  zalo: 'publish-zalo',
  facebook: 'publish-facebook',
  instagram: 'publish-instagram',
  linkedin: 'publish-linkedin',
  twitter: 'publish-twitter',
  threads: 'publish-threads',
  'google-business': 'publish-google-business',
  website: 'publish-website',
  blog: 'publish-blog',
  'flowa_blog': 'publish-blog',
};

Deno.serve(withPerf({ functionName: 'channel-publisher' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (!action || !PLATFORM_FUNCTION_MAP[action]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid action: ${action}. Supported: ${Object.keys(PLATFORM_FUNCTION_MAP).join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const functionName = PLATFORM_FUNCTION_MAP[action];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    // Forward the original Authorization header so per-user context is preserved
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    console.log(`[channel-publisher] routing action="${action}" → ${functionName}`);

    // For flowa_blog, inject is_public = true into payload
    const finalPayload = action === 'flowa_blog' 
      ? { ...payload, is_public: true } 
      : payload;

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        apikey: apiKey,
      },
      body: JSON.stringify(finalPayload),
    });

    // Stream the response back transparently
    const responseBody = await response.text();

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[channel-publisher] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal routing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
