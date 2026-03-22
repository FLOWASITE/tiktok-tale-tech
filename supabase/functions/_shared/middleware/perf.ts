// ============================================
// Performance Middleware
// Wraps Edge Function handlers with timing,
// cold start detection, and structured logging
// ============================================

let _isColdStart = true;

interface PerfResult {
  durationMs: number;
  isColdStart: boolean;
}

interface PerfOptions {
  functionName: string;
  /** Log warning if duration exceeds this (ms). Default: 10000 */
  slowThresholdMs?: number;
}

/**
 * Wrap a Deno.serve handler with performance tracking
 * 
 * Usage:
 * ```ts
 * import { withPerf } from "../_shared/middleware/perf.ts";
 * 
 * Deno.serve(withPerf({ functionName: 'publish-zalo' }, async (req) => {
 *   // ... your handler logic
 *   return new Response(JSON.stringify({ success: true }), { ... });
 * }));
 * ```
 */
export function withPerf(
  options: PerfOptions,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  const { functionName, slowThresholdMs = 10000 } = options;

  return async (req: Request): Promise<Response> => {
    const start = performance.now();
    const coldStart = _isColdStart;
    _isColdStart = false;

    const method = req.method;
    const url = new URL(req.url);

    // Skip timing for OPTIONS
    if (method === 'OPTIONS') {
      return handler(req);
    }

    let response: Response;
    let hadError = false;
    let errorMsg: string | undefined;

    try {
      response = await handler(req);
    } catch (error) {
      hadError = true;
      errorMsg = error instanceof Error ? error.message : String(error);
      const durationMs = Math.round(performance.now() - start);
      console.error(`[PERF][ERROR] ${functionName}`, JSON.stringify({
        fn: functionName, method, durationMs, coldStart, error: errorMsg,
      }));
      // Fire-and-forget metrics write
      persistMetric(functionName, durationMs, 500, coldStart, true, errorMsg);
      throw error;
    }

    const durationMs = Math.round(performance.now() - start);

    const logData: Record<string, unknown> = {
      fn: functionName, method, path: url.pathname,
      status: response.status, durationMs, coldStart,
    };

    if (durationMs > slowThresholdMs) {
      console.warn(`[PERF][SLOW] ${functionName}`, JSON.stringify(logData));
    } else {
      console.log(`[PERF] ${functionName}`, JSON.stringify(logData));
    }

    // Fire-and-forget metrics write
    persistMetric(functionName, durationMs, response.status, coldStart, response.status >= 400);

    // Add perf headers
    const headers = new Headers(response.headers);
    headers.set('X-Duration-Ms', String(durationMs));
    if (coldStart) headers.set('X-Cold-Start', 'true');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Persist a metric row (fire-and-forget, never blocks the response)
 */
function persistMetric(
  functionName: string,
  durationMs: number,
  statusCode: number,
  isColdStart: boolean,
  hadError: boolean,
  errorMessage?: string,
) {
  try {
    const client = getServiceClient();
    client.from('edge_function_metrics').insert({
      function_name: functionName,
      duration_ms: durationMs,
      status_code: statusCode,
      is_cold_start: isColdStart,
      had_error: hadError,
      error_message: errorMessage || null,
    }).then(({ error }) => {
      if (error) console.warn('[PERF] metric write failed:', error.message);
    });
  } catch {
    // Never let metric persistence break the function
  }
}

// ---- Global Scope Supabase Client Singleton ----

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

let _serviceClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase service-role client (singleton, global scope)
 * Reused across requests to avoid cold start overhead
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    _serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }
  return _serviceClient;
}

let _anonClient: SupabaseClient | null = null;

/**
 * Get or create a Supabase anon client (singleton, global scope)
 */
export function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
  }
  return _anonClient;
}

/**
 * Create an auth-scoped client from a Bearer token
 * Uses singleton pattern for underlying connection
 */
export function getAuthClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}
