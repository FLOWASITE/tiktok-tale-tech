import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface TelegramBinding {
  id: string;
  organization_id: string;
  user_id: string | null;
  telegram_chat_id: number;
  chat_type: 'private' | 'group' | 'supergroup';
  telegram_username: string | null;
  linked_at: string;
  last_command_at: string | null;
  is_active: boolean;
}

export function useTelegramBinding() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const [binding, setBinding] = useState<TelegramBinding | null>(null);
  const [groupBinding, setGroupBinding] = useState<TelegramBinding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBindings = useCallback(async () => {
    if (!currentOrganization || !user) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      const { data: personal } = await client
        .from('telegram_chat_bindings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .eq('chat_type', 'private')
        .eq('is_active', true)
        .maybeSingle();
      setBinding((personal as TelegramBinding) ?? null);

      const { data: group } = await client
        .from('telegram_chat_bindings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle();
      setGroupBinding((group as TelegramBinding) ?? null);
    } catch (err) {
      console.error('[useTelegramBinding] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, user]);

  useEffect(() => {
    fetchBindings();
  }, [fetchBindings]);

  const generateDeeplink = useCallback(async (): Promise<{ deeplink: string; expires_in: number } | null> => {
    if (!currentOrganization) return null;
    const { data, error } = await supabase.functions.invoke('telegram-link-token', {
      body: { organization_id: currentOrganization.id },
    });

    // Try to extract structured error body even on non-2xx responses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errCtx = (error as any)?.context;
    let errorBody: { error?: string; code?: string; needs_admin_setup?: boolean } | null = null;
    if (errCtx && typeof errCtx.json === 'function') {
      try { errorBody = await errCtx.json(); } catch { /* ignore */ }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataAsAny = data as any;
    const payload = errorBody ?? (dataAsAny?.error ? dataAsAny : null);

    if (error || payload?.error) {
      const description =
        payload?.error ??
        error?.message ??
        'Không tạo được link kết nối';
      toast({
        title: payload?.needs_admin_setup ? 'Chưa cấu hình bot' : 'Lỗi tạo link',
        description,
        variant: 'destructive',
      });
      return null;
    }
    return data as { deeplink: string; expires_in: number };
  }, [currentOrganization]);

  const unlink = useCallback(async () => {
    if (!binding) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('telegram_chat_bindings')
      .delete()
      .eq('id', binding.id);
    if (error) {
      toast({ title: 'Lỗi', description: 'Không gỡ được kết nối', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Đã gỡ', description: 'Đã gỡ kết nối Telegram' });
    await fetchBindings();
  }, [binding, fetchBindings]);

  return {
    binding,
    groupBinding,
    loading,
    generateDeeplink,
    unlink,
    refresh: fetchBindings,
  };
}
