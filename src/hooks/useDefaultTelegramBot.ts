import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DefaultTelegramBot {
  bot_username: string;
  is_active: boolean;
}

export function useDefaultTelegramBot() {
  const [defaultBot, setDefaultBot] = useState<DefaultTelegramBot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('telegram_default_bot_public')
          .select('bot_username, is_active')
          .maybeSingle();
        if (!cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (error && (error as any).code !== 'PGRST116') {
            console.error('[useDefaultTelegramBot] fetch error:', error);
            setDefaultBot(null);
          } else {
            setDefaultBot((data as DefaultTelegramBot) ?? null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useDefaultTelegramBot] fetch exception:', err);
          setDefaultBot(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { defaultBot, loading };
}
