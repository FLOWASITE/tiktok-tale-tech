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
  userId: string | null;
  organizationId: string | null;
  webApp: TelegramWebApp | null;
}

/**
 * Reads Telegram.WebApp.initData, posts to telegram-webapp-auth edge
 * function, and signs into Supabase with the returned token_hash.
 * Caller passes ?org=<uuid> in URL OR we infer from a previous session.
 */
export function useTelegramWebApp(): TelegramAppAuth {
  const [state, setState] = useState<TelegramAppAuth>({
    ready: false,
    authenticated: false,
    loading: true,
    error: null,
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
          }));
        }
        return;
      }
      wa.ready();
      wa.expand();

      // Resolve organization_id — required to validate HMAC against the right bot.
      // Order: ?org=... → Telegram start_param → localStorage cache.
      const params = new URLSearchParams(window.location.search);
      const startParam = wa.initDataUnsafe?.start_param;
      // start_param may carry "org_<uuid>" or raw uuid (depending on bot deep-link convention).
      const startParamOrg = startParam?.startsWith('org_') ? startParam.slice(4) : startParam;
      const candidateOrgId = params.get('org') || startParamOrg || localStorage.getItem('flowa_tg_app_org');

      const { data: existing } = await supabase.auth.getSession();
      const existingUserId = existing.session?.user?.id ?? null;

      try {
        const { data, error } = await supabase.functions.invoke('telegram-webapp-auth', {
          body: { init_data: wa.initData, organization_id: candidateOrgId ?? undefined },
        });
        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = data as any;
        if (!payload?.token_hash || !payload?.email || !payload?.organization_id) {
          throw new Error(payload?.error || 'Không nhận được token');
        }
        if (!existingUserId || existingUserId !== payload.user_id) {
          if (existingUserId && existingUserId !== payload.user_id) {
            await supabase.auth.signOut();
          }
          const { error: vErr } = await supabase.auth.verifyOtp({
            type: 'magiclink',
            token_hash: payload.token_hash,
            email: payload.email,
          });
          if (vErr) throw vErr;
        }
        localStorage.setItem('flowa_tg_app_org', payload.organization_id);
        if (!cancelled) {
          setState({
            ready: true,
            loading: false,
            authenticated: true,
            error: null,
            userId: payload.user_id,
            organizationId: payload.organization_id,
            webApp: wa,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại';
        if (!cancelled) {
          setState({
            ready: true,
            loading: false,
            authenticated: false,
            error: msg,
            userId: null,
            organizationId: candidateOrgId ?? null,
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
