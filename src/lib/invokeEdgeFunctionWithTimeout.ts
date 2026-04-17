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

  try {
    let response = await invokeRequest(token, controller.signal);
    let responseText = await response.text();

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
      return {
        data: null,
        error: new Error(`Edge Function error (${response.status}): ${responseText}`),
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

    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
