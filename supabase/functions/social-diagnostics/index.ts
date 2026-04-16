import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

function respond(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Consolidated social diagnostics — single entry point for all connection tests.
 * Routes to the appropriate test function via internal fetch.
 *
 * Body: { action: 'test-connection' | 'test-credentials', platform: 'facebook' | ..., ...payload }
 */

const PLATFORM_NAMES = [
  'facebook', 'instagram', 'linkedin', 'threads',
  'tiktok', 'twitter', 'zalo', 'google-business', 'website',
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
      return respond({
        success: false,
        error: `Invalid action/platform: ${action}/${platform}. Supported actions: test-connection, test-credentials. Platforms: ${PLATFORM_NAMES.join(', ')}`,
      });
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
    const parsedBody = parseJson<Record<string, unknown>>(responseBody);

    // Always return 200 so supabase-js does not turn upstream diagnostic
    // failures into FunctionsHttpError and hide the JSON payload from the UI.
    if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
      return respond(
        response.ok
          ? parsedBody
          : {
              ...parsedBody,
              upstream_status: response.status,
            }
      );
    }

    return respond(
      response.ok
        ? {
            success: true,
            data: responseBody || null,
          }
        : {
            success: false,
            error: responseBody || `Upstream function ${functionName} failed`,
            upstream_status: response.status,
          }
    );
  } catch (error: unknown) {
    console.error('[social-diagnostics] error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal routing error';
    return respond({
      success: false,
      error: errorMessage,
    });
  }
}));
