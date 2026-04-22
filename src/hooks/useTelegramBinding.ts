import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from '@/hooks/use-toast';

export interface TelegramBinding {
  id: string;
  organization_id: string;
  user_id: string | null;
  telegram_chat_id: number;
  telegram_user_id: number | null;
  chat_type: 'private' | 'group' | 'supergroup';
  telegram_username: string | null;
  linked_at: string;
  last_command_at: string | null;
  is_active: boolean;
}

export interface PrefetchedDeeplink {
  url: string;
  expiresAt: number; // epoch ms
  botUsername?: string;
}

const DEEPLINK_TTL_BUFFER_MS = 60_000; // refresh if < 60s left

export interface GhostBinding {
  telegram_chat_id: number;
  telegram_user_id: number | null;
  telegram_username: string | null;
  organization_id: string;
  organization_name: string | null;
}

export function useTelegramBinding() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const [binding, setBinding] = useState<TelegramBinding | null>(null);
  const [groupBinding, setGroupBinding] = useState<TelegramBinding | null>(null);
  const [ghostBinding, setGhostBinding] = useState<GhostBinding | null>(null);
  const [hasBindingConflict, setHasBindingConflict] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefetchedDeeplink, setPrefetchedDeeplink] = useState<PrefetchedDeeplink | null>(null);
  const inflightRef = useRef<Promise<PrefetchedDeeplink | null> | null>(null);

  const fetchBindings = useCallback(async (silent = false) => {
    if (!currentOrganization || !user) return;
    if (!silent) setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;

      // Fetch ALL active private bindings for this user/org. After the unique-index
      // migration there should only ever be 1, but we tolerate stale duplicates
      // gracefully (pick newest, surface conflict flag) so UI can self-heal.
      const { data: personalRows } = await client
        .from('telegram_chat_bindings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .eq('chat_type', 'private')
        .eq('is_active', true)
        .order('linked_at', { ascending: false });
      const personalList = (personalRows as TelegramBinding[] | null) ?? [];
      const personal = personalList[0] ?? null;
      setBinding(personal);
      setHasBindingConflict(personalList.length > 1);

      const { data: group } = await client
        .from('telegram_chat_bindings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle();
      setGroupBinding((group as TelegramBinding) ?? null);

      // Ghost binding: same Telegram user is linked to ANOTHER user/org.
      // We anchor on telegram_user_id from the current org's binding (if any),
      // OR from any private binding owned by the current user (cross-org leak).
      const anchorTgUserId =
        (personal as TelegramBinding | null)?.telegram_user_id ??
        null;

      let ghostQuery = client
        .from('telegram_chat_bindings')
        .select('telegram_chat_id, telegram_user_id, telegram_username, organization_id, organizations(name)')
        .eq('chat_type', 'private')
        .eq('is_active', true)
        .neq('user_id', user.id);

      if (anchorTgUserId) {
        ghostQuery = ghostQuery.eq('telegram_user_id', anchorTgUserId);
      } else {
        // No personal binding in this org → can't anchor reliably; skip.
        setGhostBinding(null);
        return;
      }

      const { data: ghost } = await ghostQuery.maybeSingle();
      if (ghost) {
        setGhostBinding({
          telegram_chat_id: ghost.telegram_chat_id,
          telegram_user_id: ghost.telegram_user_id,
          telegram_username: ghost.telegram_username,
          organization_id: ghost.organization_id,
          organization_name: ghost.organizations?.name ?? null,
        });
      } else {
        setGhostBinding(null);
      }
    } catch (err) {
      console.error('[useTelegramBinding] fetch error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentOrganization, user]);

  useEffect(() => {
    fetchBindings();
  }, [fetchBindings]);

  // Realtime: refresh khi binding được tạo/xóa (vd: user vừa /start bot trong Telegram)
  useEffect(() => {
    if (!currentOrganization || !user) return;
    const channel = supabase
      .channel(`telegram-bindings-${currentOrganization.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'telegram_chat_bindings',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        () => {
          fetchBindings(true);
        },
      )
      .subscribe();

    // Fallback polling (silent) chỉ khi CHƯA có binding — realtime là source of truth chính
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && !binding) {
        fetchBindings(true);
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [currentOrganization, user, fetchBindings, binding]);

  const generateDeeplink = useCallback(async (): Promise<{ deeplink: string; expires_in: number; bot_username?: string } | null> => {
    if (!currentOrganization) return null;
    const { data, error } = await supabase.functions.invoke('telegram-link-token', {
      body: { organization_id: currentOrganization.id },
    });

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
    return data as { deeplink: string; expires_in: number; bot_username?: string };
  }, [currentOrganization]);

  /**
   * Returns a fresh deeplink: cached if > 60s remaining, else generates new.
   * Coalesces concurrent calls via inflightRef.
   */
  const ensureDeeplink = useCallback(async (force = false): Promise<PrefetchedDeeplink | null> => {
    if (!force && prefetchedDeeplink && prefetchedDeeplink.expiresAt - Date.now() > DEEPLINK_TTL_BUFFER_MS) {
      return prefetchedDeeplink;
    }
    if (inflightRef.current) return inflightRef.current;

    const promise = (async () => {
      const result = await generateDeeplink();
      if (!result) return null;
      const next: PrefetchedDeeplink = {
        url: result.deeplink,
        expiresAt: Date.now() + (result.expires_in ?? 600) * 1000,
        botUsername: result.bot_username ?? result.deeplink.match(/t\.me\/([^/?]+)/i)?.[1],
      };
      setPrefetchedDeeplink(next);
      return next;
    })();

    inflightRef.current = promise;
    try {
      return await promise;
    } finally {
      inflightRef.current = null;
    }
  }, [generateDeeplink, prefetchedDeeplink]);

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
    setPrefetchedDeeplink(null);
    await fetchBindings();
  }, [binding, fetchBindings]);

  const unlinkGroup = useCallback(async () => {
    if (!groupBinding) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('telegram_chat_bindings')
      .delete()
      .eq('id', groupBinding.id);
    if (error) {
      toast({ title: 'Lỗi', description: 'Không gỡ được group', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Đã gỡ group', description: 'Group đã được tách khỏi tổ chức' });
    await fetchBindings();
  }, [groupBinding, fetchBindings]);

  /**
   * Reconnect flow: deactivate any active private bindings for the current
   * (org, user) pair, clear cached deeplink, then open a fresh /start deeplink
   * so Telegram rebinds the current chat. Used when bot says "Chưa kết nối"
   * but UI shows connected (stale chat_id binding).
   */
  const reconnectCurrentWorkspace = useCallback(async (): Promise<boolean> => {
    if (!currentOrganization || !user) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error: clearErr } = await client
        .from('telegram_chat_bindings')
        .delete()
        .eq('organization_id', currentOrganization.id)
        .eq('user_id', user.id)
        .eq('chat_type', 'private');
      if (clearErr) {
        toast({
          title: 'Lỗi',
          description: 'Không xóa được liên kết cũ. Thử lại sau.',
          variant: 'destructive',
        });
        return false;
      }
      setBinding(null);
      setHasBindingConflict(false);
      setPrefetchedDeeplink(null);
      const fresh = await ensureDeeplink(true);
      if (!fresh?.url) {
        toast({
          title: 'Lỗi',
          description: 'Không tạo được link mới. Thử lại sau.',
          variant: 'destructive',
        });
        await fetchBindings();
        return false;
      }
      window.open(fresh.url, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Mở Telegram',
        description: 'Bấm Start trong bot để hoàn tất kết nối lại và bắt đầu thử ngay.',
      });
      return true;
    } catch (err) {
      console.error('[useTelegramBinding] reconnect error:', err);
      toast({
        title: 'Lỗi',
        description: 'Không kết nối lại được. Thử lại sau.',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentOrganization, user, ensureDeeplink, fetchBindings]);

  /**
   * Hard reset: delete every binding for this Telegram user across ALL workspaces.
   * Used when user wants a clean slate before re-linking.
   */
  const unlinkAllForTelegramUser = useCallback(async () => {
    const tgUserId = binding?.telegram_user_id ?? ghostBinding?.telegram_user_id;
    if (!tgUserId) {
      toast({ title: 'Không tìm thấy', description: 'Không xác định được Telegram user.', variant: 'destructive' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('telegram_chat_bindings')
      .delete()
      .eq('telegram_user_id', tgUserId);
    if (error) {
      toast({ title: 'Lỗi', description: 'Không gỡ được. Thử lại sau.', variant: 'destructive' });
      throw error;
    }
    toast({ title: 'Đã gỡ tất cả', description: 'Telegram đã được tách khỏi mọi workspace.' });
    setPrefetchedDeeplink(null);
    await fetchBindings();
  }, [binding, ghostBinding, fetchBindings]);

  return {
    binding,
    groupBinding,
    ghostBinding,
    hasBindingConflict,
    loading,
    generateDeeplink,
    ensureDeeplink,
    prefetchedDeeplink,
    unlink,
    unlinkGroup,
    unlinkAllForTelegramUser,
    reconnectCurrentWorkspace,
    refresh: fetchBindings,
    setBinding, // exposed so realtime subscribers in UI can morph state immediately
  };
}
