import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Minimal Telegram WebApp typings — full SDK exposes more fields.
interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string }; start_param?: string };
  ready: () => void;
  expand: () => void;
  close: () => void;
  themeParams?: Record<string, string>;
  colorScheme?: 'light' | 'dark';
  MainButton?: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export interface TelegramAppAuth {
  ready: boolean;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  userId: string | null;
  organizationId: string | null;
  webApp: TelegramWebApp | null;
}

interface AuthPayload {
  ok?: boolean;
  user_id?: string;
  email?: string;
  token_hash?: string;
  organization_id?: string | null;
  error?: string;
  code?: string;
}

// Best-effort extraction of structured edge function error body. supabase.functions.invoke
// surfaces non-2xx as FunctionsHttpError; the actual JSON body lives on err.context.
async function parseInvokeError(
  err: unknown,
): Promise<{ message: string; code: string | null; status: number | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const status: number | null = anyErr?.context?.status ?? null;
  let body: AuthPayload | null = null;
  try {
    if (anyErr?.context && typeof anyErr.context.json === 'function') {
      body = await anyErr.context.json();
    } else if (typeof anyErr?.context?.body === 'string') {
      body = JSON.parse(anyErr.context.body);
    }
  } catch {
    /* ignore */
  }
  const message =
    body?.error || (err instanceof Error ? err.message : String(err)) || 'Đăng nhập thất bại';
  return { message, code: body?.code || null, status };
}

/**
 * Reads Telegram.WebApp.initData and resolves both an authenticated Supabase
 * session AND the active organization id. Key invariant: even if the user is
 * already signed in (e.g. opened the Mini App from a fresh session in another
 * tab), we still call telegram-webapp-auth to resolve `organization_id` from
 * the bot binding when no candidate org is provided in URL/start_param/storage.
 * This prevents the "Không xác thực được" card from appearing whenever
 * organizationId would otherwise be null.
 */
export function useTelegramWebApp(): TelegramAppAuth {
  const [state, setState] = useState<TelegramAppAuth>({
    ready: false,
    authenticated: false,
    loading: true,
    error: null,
    errorCode: null,
    userId: null,
    organizationId: null,
    webApp: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Wait for SDK script
      let tries = 0;
      while (!window.Telegram?.WebApp && tries < 20) {
        await new Promise((r) => setTimeout(r, 100));
        tries++;
      }
      const wa = window.Telegram?.WebApp;
      if (!wa || !wa.initData) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            ready: true,
            loading: false,
            error: 'Mở từ trong Telegram để dùng Mini App.',
            errorCode: 'no_init_data',
          }));
        }
        return;
      }
      wa.ready();
      wa.expand();

      // Resolve org candidate from all known sources.
      const params = new URLSearchParams(window.location.search);
      const startParam = wa.initDataUnsafe?.start_param;
      const startParamOrg = startParam?.startsWith('org_') ? startParam.slice(4) : startParam;
      const candidateOrgId =
        params.get('org') || startParamOrg || localStorage.getItem('flowa_tg_app_org') || null;

      // Snapshot existing session.
      const { data: existing } = await supabase.auth.getSession();
      const existingUserId = existing.session?.user?.id || null;

      // Fast path: session AND candidate org → no backend call needed.
      if (existingUserId && candidateOrgId) {
        if (!cancelled) {
          setState({
            ready: true,
            loading: false,
            authenticated: true,
            error: null,
            errorCode: null,
            userId: existingUserId,
            organizationId: candidateOrgId,
            webApp: wa,
          });
        }
        return;
      }

      // Otherwise we ALWAYS need to call telegram-webapp-auth — either to mint a
      // session (no existing session) OR to resolve the organization (session
      // exists but org context is missing).
      try {
        const { data, error } = await supabase.functions.invoke('telegram-webapp-auth', {
          body: {
            init_data: wa.initData,
            ...(candidateOrgId ? { organization_id: candidateOrgId } : {}),
          },
        });
        if (error) throw error;
        const payload = (data || {}) as AuthPayload;
        if (!payload.token_hash || !payload.email) {
          throw new Error(payload.error || 'Không nhận được token từ máy chủ');
        }

        // Only verify OTP when no session exists yet. Re-verifying with an
        // already-active session would needlessly rotate the token.
        if (!existingUserId) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash: payload.token_hash,
            email: payload.email,
          });
          if (vErr) throw vErr;
        }

        // Source of truth precedence: backend payload > URL/start_param/storage.
        const resolvedOrg = payload.organization_id || candidateOrgId || null;
        if (resolvedOrg) localStorage.setItem('flowa_tg_app_org', resolvedOrg);

        if (!cancelled) {
          setState({
            ready: true,
            loading: false,
            authenticated: true,
            error: resolvedOrg ? null : 'Không resolve được workspace từ Telegram.',
            errorCode: resolvedOrg ? null : 'org_unresolved',
            userId: payload.user_id || existingUserId,
            organizationId: resolvedOrg,
            webApp: wa,
          });
        }
      } catch (err) {
        const parsed = await parseInvokeError(err);
        if (!cancelled) {
          setState({
            ready: true,
            loading: false,
            // If we already had a session, keep authenticated=true so the UI
            // can distinguish "auth ok but org missing" from "auth failed".
            authenticated: !!existingUserId,
            error: parsed.message,
            errorCode: parsed.code,
            userId: existingUserId,
            organizationId: candidateOrgId,
            webApp: wa,
          });
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
