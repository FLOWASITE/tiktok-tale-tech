/**
 * Invoke a Supabase Edge Function with a configurable timeout.
 *
 * supabase.functions.invoke() relies on the browser's default fetch,
 * which can time out before long-running functions (like image generation)
 * finish.  This helper uses AbortController to give us control over
 * the deadline and also falls back to a direct fetch when needed.
 */

import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface InvokeOptions {
  body?: Record<string, unknown>;
  /** Timeout in milliseconds. Default: 120 000 (2 min) */
  timeoutMs?: number;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

function buildFetchContextMessage(functionName: string, err: unknown): string {
  if (err instanceof TypeError) {
    return `${functionName} request failed before receiving a response. This is usually a network/CORS interruption or the function runtime stopped unexpectedly.`;
  }

  return err instanceof Error ? err.message : String(err);
}

function isUnauthorizedResponse(status: number, body: string): boolean {
  return status === 401 && /unauthorized|auth session missing|invalid token|expired session|session/i.test(body);
}

export async function invokeWithTimeout<T = unknown>(
  functionName: string,
  options: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  const { body, timeoutMs = 120_000 } = options;

  // Build the full URL
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const invokeRequest = async (accessToken: string | null, signal: AbortSignal) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  };

  let token = await getAccessToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Detect transient Supabase Edge Runtime errors (cold-start / recycle 503s)
  const isTransientRuntimeError = (status: number, body: string): boolean => {
    if (status !== 503 && status !== 502 && status !== 504) return false;
    return /SUPABASE_EDGE_RUNTIME_ERROR|temporarily unavailable|BOOT_ERROR|WORKER_LIMIT/i.test(body);
  };

  // Helper: attempt fetch + read body, returning null on network error so caller can retry
  const tryRequest = async (tok: string | null): Promise<{ response: Response; responseText: string } | { networkError: unknown }> => {
    try {
      const response = await invokeRequest(tok, controller.signal);
      const responseText = await response.text();
      return { response, responseText };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      return { networkError: err };
    }
  };

  try {
    let attempt = await tryRequest(token);
    let transientRetries = 0;

    // Retry on either HTTP transient runtime errors OR network "Failed to fetch" (worker dropped connection)
    const MAX_TRANSIENT_RETRIES = 5;
    while (
      transientRetries < MAX_TRANSIENT_RETRIES &&
      ('networkError' in attempt ||
        isTransientRuntimeError(attempt.response.status, attempt.responseText))
    ) {
      transientRetries++;
      // Exponential backoff with jitter: 500ms, 1s, 2s, 4s, 8s (+random 0-300ms)
      const backoffMs = 500 * Math.pow(2, transientRetries - 1) + Math.floor(Math.random() * 300);
      const reason = 'networkError' in attempt
        ? 'network failure'
        : `${attempt.response.status}`;
      console.warn(`[invokeWithTimeout] ${functionName} hit transient ${reason}, retrying in ${backoffMs}ms (attempt ${transientRetries}/${MAX_TRANSIENT_RETRIES})`);
      await new Promise((r) => setTimeout(r, backoffMs));
      attempt = await tryRequest(token);
    }

    // If still a network error after retries, surface it
    if ('networkError' in attempt) {
      throw attempt.networkError;
    }

    let response = attempt.response;
    let responseText = attempt.responseText;

    if (token && isUnauthorizedResponse(response.status, responseText)) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      const refreshedToken = refreshed.session?.access_token ?? null;

      if (refreshError || !refreshedToken) {
        await supabase.auth.signOut().catch(() => undefined);
        clearTimeout(timer);
        return {
          data: null,
          error: new Error('Session expired. Please sign in again.'),
        };
      }

      token = refreshedToken;
      response = await invokeRequest(token, controller.signal);
      responseText = await response.text();
    }

    clearTimeout(timer);

    if (!response.ok) {
      const error = new Error(`Edge Function error (${response.status}): ${responseText}`);
      (error as Error & { context?: { status: number; body: string } }).context = {
        status: response.status,
        body: responseText,
      };
      return {
        data: null,
        error,
      };
    }

    if (!responseText || !responseText.trim()) {
      return { data: null, error: null };
    }

    try {
      const data = JSON.parse(responseText) as T;
      return { data, error: null };
    } catch {
      return {
        data: null,
        error: new Error('Edge Function returned invalid JSON response'),
      };
    }
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        data: null,
        error: new Error('Edge Function timed out after ' + (timeoutMs / 1000) + 's'),
      };
    }

      const baseMessage = buildFetchContextMessage(functionName, err);
      return {
        data: null,
        error: new Error(`Edge Function request failed: ${baseMessage}`),
      };
  }
}
