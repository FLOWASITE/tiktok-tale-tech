import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface TelegramBotConfig {
  id: string;
  organization_id: string;
  bot_username: string;
  webhook_secret: string;
  is_active: boolean;
  group_chat_id: number | null;
  default_autonomy_level: 'human_in_loop' | 'human_on_loop' | 'full_auto';
  created_at: string;
  updated_at: string;
}

export interface UpsertBotConfigInput {
  bot_username: string;
  bot_token?: string;
  default_autonomy_level?: TelegramBotConfig['default_autonomy_level'];
  is_active?: boolean;
}

export function useTelegramBotConfig() {
  const { currentOrganization } = useOrganizationContext();
  const [config, setConfig] = useState<TelegramBotConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!currentOrganization) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('telegram_bot_configs')
        .select('id, organization_id, bot_username, webhook_secret, is_active, group_chat_id, default_autonomy_level, created_at, updated_at')
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && (error as any).code !== 'PGRST116') throw error;
      setConfig((data as TelegramBotConfig) ?? null);
    } catch (err) {
      console.error('[useTelegramBotConfig] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const upsertConfig = useCallback(async (input: UpsertBotConfigInput) => {
    if (!currentOrganization) return;

    const { data, error } = await supabase.functions.invoke('telegram-bot-admin', {
      body: { action: 'upsert', organization_id: currentOrganization.id, ...input },
    });

    if (error) {
      toast({ title: 'Lỗi', description: error.message ?? 'Không lưu được cấu hình', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Đã lưu', description: 'Cấu hình bot Telegram đã cập nhật' });
    await fetchConfig();
    return data;
  }, [currentOrganization, fetchConfig]);

  const deleteConfig = useCallback(async () => {
    if (!currentOrganization || !config) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('telegram_bot_configs')
      .delete()
      .eq('id', config.id);
    if (error) {
      toast({ title: 'Lỗi', description: 'Không xóa được', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Đã xóa', description: 'Đã gỡ cấu hình bot Telegram' });
    await fetchConfig();
  }, [currentOrganization, config, fetchConfig]);

  const registerWebhook = useCallback(async () => {
    if (!currentOrganization) return;
    const { data, error } = await supabase.functions.invoke('telegram-bot-admin', {
      body: { action: 'register_webhook', organization_id: currentOrganization.id },
    });
    if (error) {
      toast({ title: 'Lỗi', description: error.message ?? 'Không đăng ký được webhook', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Webhook đã đăng ký', description: 'Telegram sẽ gửi update tới endpoint' });
    return data;
  }, [currentOrganization]);

  return { config, loading, upsertConfig, deleteConfig, registerWebhook, refresh: fetchConfig };
}
