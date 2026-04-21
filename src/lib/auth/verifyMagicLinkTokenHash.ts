import { supabase } from '@/integrations/supabase/client';

interface DirectVerifyResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { id?: string } | null;
  error?: string;
  error_description?: string;
  msg?: string;
  code?: string;
  [key: string]: unknown;
}

export interface VerifyMagicLinkTokenHashResult {
  userId: string | null;
  raw: DirectVerifyResponse;
}

function makeAuthError(message: string, code: string | undefined, status: number, body: unknown): Error {
  const error = new Error(message) as Error & { code?: string; status?: number; body?: unknown };
  error.code = code;
  error.status = status;
  error.body = body;
  return error;
}

async function readJsonOrText(response: Response): Promise<DirectVerifyResponse> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as DirectVerifyResponse;
  } catch {
    return { error: text };
  }
}

export async function verifyMagicLinkTokenHash(
  tokenHash: string,
): Promise<VerifyMagicLinkTokenHashResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!supabaseUrl || !anonKey) {
    throw makeAuthError('Thiếu cấu hình xác thực', 'auth_config_missing', 500, null);
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash: tokenHash,
    }),
  });

  const body = await readJsonOrText(response);
  if (!response.ok) {
    throw makeAuthError(
      body.error_description || body.error || body.msg || 'Không tạo được phiên đăng nhập',
      body.code || 'verify_token_hash_failed',
      response.status,
      body,
    );
  }

  if (!body.access_token || !body.refresh_token) {
    throw makeAuthError('Auth verify không trả session token', 'verify_session_missing', response.status, body);
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });

  if (error) throw error;

  return {
    userId: data.session?.user?.id || data.user?.id || body.user?.id || null,
    raw: body,
  };
}