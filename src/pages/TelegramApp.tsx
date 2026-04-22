import { useEffect, useState, useCallback, useRef } from 'react';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Loader2, LayoutDashboard, Plus, CheckSquare, AlertCircle, Sparkles, Palette, Bell, CalendarClock, Eye, X as XIcon, RefreshCw, FileText, Inbox, AlertTriangle } from 'lucide-react';
import { Loading, formatDateTime, getTelegramMiniApp } from './telegram/shared';
import { BrandSwitcherSheet } from './telegram/BrandSwitcherSheet';
import { QuickPostTab } from './telegram/QuickPostTab';
import { PostsTab } from './telegram/PostsTab';
import { ConnectionsTab, countExpiredConnections } from './telegram/ConnectionsTab';
import { InboxTab } from './telegram/InboxTab';

type Tab = 'dashboard' | 'create' | 'posts' | 'approve' | 'scheduled' | 'inbox' | 'connections';
type CreateMode = 'quick' | 'campaign';

export default function TelegramApp() {
  const { ready, authenticated, loading, error, errorCode, userId, organizationId } = useTelegramWebApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [deepLinkApprovalId, setDeepLinkApprovalId] = useState<string | null>(null);
  const [deepLinkContentId, setDeepLinkContentId] = useState<string | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [activeBrandName, setActiveBrandName] = useState<string | null>(null);
  const [brandSheetOpen, setBrandSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);
  const lastProcessedDeepLinkRef = useRef<string>('');

  // Load active brand from telegram_chat_bindings + name
  const refreshActiveBrand = useCallback(async () => {
    if (!organizationId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const tg = getTelegramMiniApp();
    const chatIdRaw = tg?.initDataUnsafe?.user?.id;
    let brandId: string | null = null;
    if (chatIdRaw) {
      const { data } = await sb.from('telegram_chat_bindings')
        .select('active_brand_template_id')
        .eq('organization_id', organizationId)
        .eq('telegram_chat_id', chatIdRaw)
        .maybeSingle();
      brandId = data?.active_brand_template_id ?? null;
    }
    if (!brandId) {
      // fallback to default brand
      const { data } = await sb.from('brand_templates')
        .select('id, brand_name')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        brandId = data.id;
        setActiveBrandName(data.brand_name);
      }
    } else {
      const { data } = await sb.from('brand_templates').select('brand_name').eq('id', brandId).maybeSingle();
      setActiveBrandName(data?.brand_name ?? null);
    }
    setActiveBrandId(brandId);
  }, [organizationId]);

  useEffect(() => { void refreshActiveBrand(); }, [refreshActiveBrand]);

  // Notification unread count
  const refreshUnread = useCallback(async () => {
    if (!userId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { count } = await sb.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => { void refreshUnread(); }, [refreshUnread, tab]);

  // Realtime: bump unread on insert
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel('mini-app-bell')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => setUnreadCount((n) => n + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Expired connections count
  useEffect(() => {
    if (!organizationId) return;
    void countExpiredConnections(organizationId, activeBrandId).then(setExpiredCount);
  }, [organizationId, activeBrandId, tab]);

  const clearConsumedHash = useCallback(() => {
    if (!window.location.hash) return;
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    } catch {
      // ignore
    }
  }, []);

  const applyDeepLinkFromLocation = useCallback(() => {
    if (!authenticated) return;

    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    const params = new URLSearchParams(search);
    const view = params.get('view');
    let id = params.get('id') || params.get('approval_id') || params.get('approvalId');

    const hashMcMatch = /(?:^|[#/])multichannel[/=]([0-9a-f-]{8,})/i.exec(hash);
    const pathMcMatch = /\/telegram-app(?:\/.*)?\/multichannel\/([0-9a-f-]{8,})/i.exec(pathname)
      || /\/multichannel\/([0-9a-f-]{8,})/i.exec(pathname);
    const mcId = hashMcMatch?.[1] || pathMcMatch?.[1] || null;

    if (mcId) {
      const marker = `mc:${mcId}`;
      if (lastProcessedDeepLinkRef.current !== marker) {
        lastProcessedDeepLinkRef.current = marker;
        setTab('posts');
        setDeepLinkContentId(mcId);
      }
      clearConsumedHash();
      return;
    }

    if (!id) {
      const wa = getTelegramMiniApp() as unknown as { initDataUnsafe?: { start_param?: string } } | undefined;
      const startParam = wa?.initDataUnsafe?.start_param;
      if (startParam) {
        const m = /^approve[_-]([0-9a-f-]{8,})$/i.exec(startParam);
        if (m) id = m[1];
      }
    }
    if (!id && hash) {
      const m = /(?:approve|approval)[/=]([0-9a-f-]{8,})/i.exec(hash);
      if (m) id = m[1];
    }
    if (!id) {
      try {
        const stashed = sessionStorage.getItem('flowa_tg_pending_approval');
        if (stashed) id = stashed;
      } catch { /* ignore */ }
    }

    if (view === 'approve' || id) {
      const marker = id ? `approval:${id}` : 'approve:view';
      if (lastProcessedDeepLinkRef.current !== marker) {
        lastProcessedDeepLinkRef.current = marker;
        setTab('approve');
        if (id) {
          setDeepLinkApprovalId(id);
          try { sessionStorage.setItem('flowa_tg_pending_approval', id); } catch { /* ignore */ }
        }
      }
      clearConsumedHash();
      return;
    }

    if (/approve|approval/i.test(hash)) {
      lastProcessedDeepLinkRef.current = 'approve:hash';
      setTab('approve');
      clearConsumedHash();
    }
  }, [authenticated, clearConsumedHash]);

  useEffect(() => {
    if (!authenticated) return;

    const run = () => {
      applyDeepLinkFromLocation();
    };

    const onVisible = () => {
      if (!document.hidden) {
        lastProcessedDeepLinkRef.current = '';
        run();
      }
    };

    run();
    window.addEventListener('hashchange', run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('hashchange', run);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authenticated, applyDeepLinkFromLocation]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Đang xác thực Telegram…</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !userId || !organizationId) {
    const sessionOkButOrgMissing = authenticated && !!userId && !organizationId;
    const title = sessionOkButOrgMissing ? 'Chưa xác định được workspace' : 'Không xác thực được';
    let hint: string | null = null;
    if (errorCode === 'not_linked') hint = 'Tài khoản Telegram chưa liên kết workspace. Hãy gõ /start trong DM với bot trước.';
    else if (errorCode === 'ambiguous_org') hint = 'Tài khoản đang liên kết nhiều workspace. Mở Mini App từ menu bot có gắn ?org=<id>.';
    else if (errorCode === 'no_init_data') hint = 'Hãy mở Mini App từ trong bot Telegram (không mở trực tiếp link).';
    else if (sessionOkButOrgMissing) hint = 'Đã đăng nhập Flowa nhưng chưa map được Telegram → workspace. Thử /start trong DM với bot.';

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error || 'Hãy mở Mini App từ trong bot Telegram.'}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-3 pt-3 pb-2 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-semibold text-base">Flowa</h1>
          <button
            onClick={() => setBrandSheetOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-accent text-xs max-w-[140px]"
          >
            <Palette className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{activeBrandName || 'Chọn brand'}</span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setTab('inbox')} className="relative p-1.5 rounded-md hover:bg-accent">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Badge variant="secondary" className="text-[10px]">Mini</Badge>
          </div>
        </div>
        {expiredCount > 0 && tab !== 'connections' && (
          <button
            onClick={() => setTab('connections')}
            className="mt-2 w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">{expiredCount} kết nối hết hạn — bấm để xử lý</span>
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-20 flex flex-col">
        {tab === 'dashboard' && <DashboardTab orgId={organizationId} />}
        {tab === 'create' && <CreateTabSwitch orgId={organizationId} userId={userId} brandId={activeBrandId} brandName={activeBrandName} onGoConnections={() => setTab('connections')} />}
        {tab === 'posts' && <PostsTab orgId={organizationId} brandId={activeBrandId} onGoConnections={() => setTab('connections')} autoOpenContentId={deepLinkContentId} onAutoOpened={() => setDeepLinkContentId(null)} />}
        {tab === 'approve' && <ApproveTab orgId={organizationId} onScheduled={() => setTab('scheduled')} autoOpenId={deepLinkApprovalId} onAutoOpened={() => setDeepLinkApprovalId(null)} />}
        {tab === 'scheduled' && <ScheduledTab orgId={organizationId} />}
        {tab === 'inbox' && <InboxTab orgId={organizationId} userId={userId} brandId={activeBrandId} />}
        {tab === 'connections' && <ConnectionsTab orgId={organizationId} brandId={activeBrandId} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card grid grid-cols-6">
        <NavBtn active={tab === 'dashboard'} icon={<LayoutDashboard className="w-4 h-4" />} label="Tổng quan" onClick={() => setTab('dashboard')} />
        <NavBtn active={tab === 'create'} icon={<Plus className="w-4 h-4" />} label="Tạo" onClick={() => setTab('create')} />
        <NavBtn active={tab === 'posts'} icon={<FileText className="w-4 h-4" />} label="Bài viết" onClick={() => setTab('posts')} />
        <NavBtn active={tab === 'approve'} icon={<CheckSquare className="w-4 h-4" />} label="Duyệt" onClick={() => setTab('approve')} />
        <NavBtn active={tab === 'scheduled'} icon={<CalendarClock className="w-4 h-4" />} label="Lịch" onClick={() => setTab('scheduled')} />
        <NavBtn active={tab === 'inbox'} icon={<Inbox className="w-4 h-4" />} label="Hộp thư" onClick={() => setTab('inbox')} badge={unreadCount} />
      </nav>

      <BrandSwitcherSheet
        open={brandSheetOpen}
        onOpenChange={setBrandSheetOpen}
        orgId={organizationId}
        activeBrandId={activeBrandId}
        onActiveBrandChange={() => { void refreshActiveBrand(); }}
      />
    </div>
  );
}

function NavBtn({ active, icon, label, onClick, badge }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="absolute top-1 right-2 bg-destructive text-destructive-foreground text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-medium">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

// =============== Create switcher (Quick / Campaign) ===============
function CreateTabSwitch({ orgId, userId, brandId, brandName, onGoConnections }: { orgId: string; userId: string; brandId: string | null; brandName: string | null; onGoConnections: () => void }) {
  const [mode, setMode] = useState<CreateMode>('quick');
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 p-3 border-b border-border bg-card">
        <button
          onClick={() => setMode('quick')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'quick' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          ⚡ Bài nhanh
        </button>
        <button
          onClick={() => setMode('campaign')}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'campaign' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
        >
          🎯 Campaign
        </button>
      </div>
      {mode === 'quick' && <QuickPostTab orgId={orgId} userId={userId} brandId={brandId} brandName={brandName} onGoConnections={onGoConnections} />}
      {mode === 'campaign' && <CampaignTab orgId={orgId} userId={userId} brandId={brandId} />}
    </div>
  );
}

// =============== Dashboard ===============
function DashboardTab({ orgId }: { orgId: string }) {
  const [data, setData] = useState<{ pendingApprovals: number; runningPipelines: number; completedThisMonth: number; plan: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const [pending, running, done, sub] = await Promise.all([
          sb.from('agent_approvals').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
          sb.from('agent_pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('completed_at', null),
          sb.from('agent_pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('completed_at', monthStart.toISOString()),
          sb.from('subscriptions').select('plan_type').eq('organization_id', orgId).eq('status', 'active').maybeSingle(),
        ]);
        setData({
          pendingApprovals: pending.count ?? 0,
          runningPipelines: running.count ?? 0,
          completedThisMonth: done.count ?? 0,
          plan: sub.data?.plan_type ?? 'free',
        });
      } catch (e) {
        console.error('[telegram-app] dashboard load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId]);

  if (loading) return <Loading />;
  if (!data) return <div className="p-4 text-sm text-muted-foreground">Không tải được dữ liệu.</div>;

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Chờ duyệt" value={data.pendingApprovals} highlight={data.pendingApprovals > 0} />
        <StatCard label="Đang chạy" value={data.runningPipelines} />
        <StatCard label="Hoàn tất tháng" value={data.completedThisMonth} />
        <StatCard label="Gói" value={data.plan.toUpperCase()} />
      </div>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            👋 Bấm <strong>Tạo</strong> → Bài nhanh để post 1 bài/1 kênh, hoặc Campaign cho chiến dịch dài hạn.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

// =============== Campaign (preserved) ===============
function CampaignTab({ orgId, userId, brandId }: { orgId: string; userId: string; brandId: string | null }) {
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!topic.trim()) {
      toast.error('Nhập mô tả trước nhé.');
      return;
    }
    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: goal, error } = await sb.from('agent_goals').insert({
        name: topic.slice(0, 120),
        description: topic,
        organization_id: orgId,
        created_by: userId,
        brand_template_id: brandId || null,
        target_topics: [],
        target_channels: [],
        frequency: {},
        autonomy_level: 'human_on_loop',
        approval_mode: 'approve_plan',
        is_active: true,
      }).select('id').single();
      if (error) throw error;
      toast.success('✅ Đã tạo. Pipeline sẽ chạy nền.');
      setTopic('');
      void supabase.functions.invoke('agent-pipeline', {
        body: { action: 'trigger_from_goal', goal_id: goal.id, organization_id: orgId },
      });
    } catch (e) {
      toast.error('❌ ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-xs text-muted-foreground">Mô tả campaign</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={5}
          placeholder="VD: campaign Tết cho spa làm đẹp, target nữ 25-40, 10 bài đa kênh"
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Tạo & chạy
      </Button>
    </div>
  );
}

// =============== Approve (preserved from original) ===============
type ApprovalItem = {
  id: string;
  content_preview: string | null;
  created_at: string;
  pipeline_id: string;
  content_id: string | null;
  content_title: string | null;
  scheduled_publish_at: string | null;
  selected_channels: string[] | null;
};
type ImageRow = { image_url: string; channel: string };

const APPROVAL_FETCH_CACHE = new Map<string, { item: ApprovalItem; status: string | null; cachedAt: number }>();
const APPROVAL_FETCH_TTL_MS = 60_000;
function readApprovalCache(id: string) {
  const hit = APPROVAL_FETCH_CACHE.get(id);
  if (!hit) return null;
  if (Date.now() - hit.cachedAt > APPROVAL_FETCH_TTL_MS) {
    APPROVAL_FETCH_CACHE.delete(id);
    return null;
  }
  return hit;
}

function ApproveTab({ orgId, onScheduled, autoOpenId, onAutoOpened }: { orgId: string; onScheduled: () => void; autoOpenId?: string | null; onAutoOpened?: () => void }) {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ApprovalItem | null>(null);
  const [previewImages, setPreviewImages] = useState<ImageRow[]>([]);
  const [previewFullText, setPreviewFullText] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [retryingOpen, setRetryingOpen] = useState(false);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from('agent_approvals')
      .select('id, content_preview, created_at, pipeline_id, agent_pipelines!inner(content_id, content_title, scheduled_publish_at, multi_channel_contents(selected_channels))')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: ApprovalItem[] = (data ?? []).map((r: any) => ({
      id: r.id,
      content_preview: r.content_preview,
      created_at: r.created_at,
      pipeline_id: r.pipeline_id,
      content_id: r.agent_pipelines?.content_id ?? null,
      content_title: r.agent_pipelines?.content_title ?? null,
      scheduled_publish_at: r.agent_pipelines?.scheduled_publish_at ?? null,
      selected_channels: r.agent_pipelines?.multi_channel_contents?.selected_channels ?? null,
    }));
    setItems(mapped);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [orgId]);

  useEffect(() => {
    if (!autoOpenId) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 6;

    async function tryOpen() {
      if (cancelled) return;
      const target = items.find((x) => x.id === autoOpenId);
      if (target) {
        await openPreview(target);
        try { sessionStorage.removeItem('flowa_tg_pending_approval'); } catch { /* ignore */ }
        onAutoOpened?.();
        return;
      }
      if (loading || (items.length === 0 && attempts < MAX_ATTEMPTS)) {
        attempts++;
        setTimeout(tryOpen, 1000);
        return;
      }
      const cached = readApprovalCache(autoOpenId);
      if (cached) {
        await openPreview(cached.item);
        try { sessionStorage.removeItem('flowa_tg_pending_approval'); } catch { /* ignore */ }
        onAutoOpened?.();
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data } = await sb.from('agent_approvals')
          .select('id, content_preview, created_at, pipeline_id, status, agent_pipelines!inner(content_id, content_title, scheduled_publish_at, multi_channel_contents(selected_channels))')
          .eq('id', autoOpenId)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          const hydrated: ApprovalItem = {
            id: data.id,
            content_preview: data.content_preview,
            created_at: data.created_at,
            pipeline_id: data.pipeline_id,
            content_id: data.agent_pipelines?.content_id ?? null,
            content_title: data.agent_pipelines?.content_title ?? null,
            scheduled_publish_at: data.agent_pipelines?.scheduled_publish_at ?? null,
            selected_channels: data.agent_pipelines?.multi_channel_contents?.selected_channels ?? null,
          };
          APPROVAL_FETCH_CACHE.set(autoOpenId, { item: hydrated, status: data.status ?? null, cachedAt: Date.now() });
          await openPreview(hydrated);
          try { sessionStorage.removeItem('flowa_tg_pending_approval'); } catch { /* ignore */ }
          onAutoOpened?.();
          return;
        }
      } catch (e) {
        console.warn('[telegram-app] direct fetch by id failed', e);
      }
      if (attempts < MAX_ATTEMPTS) {
        attempts++;
        setTimeout(tryOpen, 1000);
        return;
      }
      toast.info('Không tìm thấy yêu cầu duyệt này.');
      try { sessionStorage.removeItem('flowa_tg_pending_approval'); } catch { /* ignore */ }
      onAutoOpened?.();
    }

    void tryOpen();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenId, loading, items.length, orgId, retryNonce]);

  async function retryAutoOpen() {
    setRetryingOpen(true);
    try {
      await load();
      setRetryNonce((n) => n + 1);
    } finally {
      setRetryingOpen(false);
    }
  }

  async function openPreview(it: ApprovalItem) {
    setPreviewItem(it);
    setPreviewImages([]);
    setPreviewFullText('');
    if (!it.content_id) return;
    setPreviewLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [imgsRes, contentRes] = await Promise.all([
        sb.from('channel_image_history').select('image_url, channel, is_selected, version').eq('content_id', it.content_id).order('version', { ascending: false }).limit(20),
        sb.from('multi_channel_contents').select('channel_versions').eq('id', it.content_id).maybeSingle(),
      ]);
      const byChannel = new Map<string, ImageRow>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imgsRes.data ?? []).forEach((r: any) => {
        if (!r.image_url) return;
        if (!byChannel.has(r.channel) || r.is_selected) byChannel.set(r.channel, { image_url: r.image_url, channel: r.channel });
      });
      setPreviewImages(Array.from(byChannel.values()).slice(0, 6));
      const cv = contentRes.data?.channel_versions || {};
      let longest = '';
      for (const k of Object.keys(cv)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v: any = cv[k];
        const txt = typeof v === 'string' ? v : (v?.content || v?.text || v?.body || '');
        if (typeof txt === 'string' && txt.length > longest.length) longest = txt;
      }
      setPreviewFullText(longest || it.content_preview || '');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id);
    const target = items.find((x) => x.id === id);
    try {
      const { data, error } = await supabase.functions.invoke('agent-approve', {
        body: { approval_id: id, action, notes: 'via Telegram Mini App' },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      if (resp?.ok === false) throw new Error(resp.error || 'Lỗi không xác định');
      setItems((arr) => arr.filter((x) => x.id !== id));
      APPROVAL_FETCH_CACHE.delete(id);
      setPreviewItem(null);
      if (action === 'reject') {
        toast.success('Đã từ chối — pipeline trả về sáng tạo');
        return;
      }
      const sched = target?.scheduled_publish_at;
      if (sched) {
        toast.success(`Đã duyệt. Sẽ đăng lúc ${formatDateTime(sched)}`, { action: { label: 'Xem lịch', onClick: onScheduled } });
      } else {
        toast.success('Đã duyệt — pipeline tiếp tục', { action: { label: 'Xem lịch', onClick: onScheduled } });
      }
    } catch (e) {
      toast.error('Lỗi: ' + (e instanceof Error ? e.message : 'Không xác định'));
    } finally {
      setActing(null);
    }
  }

  if (loading) return <Loading />;
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Không có nội dung nào chờ duyệt 🎉</p>
        <Button variant="default" size="sm" onClick={retryAutoOpen} disabled={retryingOpen} className="mt-3">
          {retryingOpen ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Làm mới
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{items.length} yêu cầu chờ duyệt</div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={retryAutoOpen} disabled={retryingOpen}>
            {retryingOpen ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Làm mới
          </Button>
        </div>
        {items.map((it) => (
          <Card key={it.id}>
            <CardContent className="pt-4 space-y-3">
              {it.content_title && <div className="text-xs font-medium text-foreground/80 line-clamp-1">{it.content_title}</div>}
              <p className="text-sm whitespace-pre-line line-clamp-6">{it.content_preview || '_Không có preview_'}</p>
              {it.scheduled_publish_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Sẽ đăng: {formatDateTime(it.scheduled_publish_at)}{it.selected_channels?.length ? ` • ${it.selected_channels.join(', ')}` : ''}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" disabled={acting === it.id} onClick={() => openPreview(it)}>
                  <Eye className="w-4 h-4 mr-1" /> Xem
                </Button>
                <Button size="sm" variant="outline" className="flex-1" disabled={acting === it.id} onClick={() => act(it.id, 'reject')}>
                  ❌ Từ chối
                </Button>
                <Button size="sm" className="flex-1" disabled={acting === it.id} onClick={() => act(it.id, 'approve')}>
                  {acting === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Duyệt'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Drawer open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader>
            <DrawerTitle className="text-base line-clamp-2">{previewItem?.content_title || 'Xem nội dung đầy đủ'}</DrawerTitle>
            {previewItem?.scheduled_publish_at && (
              <DrawerDescription className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Sẽ đăng: {formatDateTime(previewItem.scheduled_publish_at)}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto space-y-4">
            {previewLoading && <Loading />}
            {!previewLoading && previewImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previewImages.map((img, i) => (
                  <div key={i} className="space-y-1">
                    <img src={img.image_url} alt={img.channel} className="w-full aspect-square object-cover rounded-md border border-border" loading="lazy" />
                    <div className="text-[10px] text-muted-foreground capitalize">{img.channel}</div>
                  </div>
                ))}
              </div>
            )}
            {!previewLoading && (
              <div className="text-sm whitespace-pre-line text-foreground/90">{previewFullText || '_Không có nội dung_'}</div>
            )}
            {previewItem && (
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-2">
                <Button variant="outline" className="flex-1" disabled={acting === previewItem.id} onClick={() => act(previewItem.id, 'reject')}>❌ Từ chối</Button>
                <Button className="flex-1" disabled={acting === previewItem.id} onClick={() => act(previewItem.id, 'approve')}>
                  {acting === previewItem.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Duyệt'}
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// =============== Scheduled (preserved) ===============
type ScheduleRow = { id: string; scheduled_at: string; channel: string; publish_status: string; content_id: string; title?: string | null; thumbnail?: string | null };

function ScheduledTab({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: schedules } = await sb.from('content_schedules')
        .select('id, scheduled_at, channel, publish_status, content_id')
        .eq('organization_id', orgId)
        .in('publish_status', ['scheduled', 'publishing'])
        .order('scheduled_at', { ascending: true })
        .limit(50);
      const rows: ScheduleRow[] = schedules ?? [];
      const contentIds = Array.from(new Set(rows.map((r) => r.content_id).filter(Boolean)));
      const titleMap = new Map<string, string>();
      const imgMap = new Map<string, string>();
      if (contentIds.length) {
        const [titlesRes, imgsRes] = await Promise.all([
          sb.from('multi_channel_contents').select('id, title').in('id', contentIds),
          sb.from('channel_image_history').select('content_id, image_url, channel, is_selected').in('content_id', contentIds),
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (titlesRes.data ?? []).forEach((r: any) => titleMap.set(r.id, r.title));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (imgsRes.data ?? []).forEach((r: any) => {
          const k = `${r.content_id}::${r.channel}`;
          if (!imgMap.has(k) || r.is_selected) imgMap.set(k, r.image_url);
        });
      }
      setItems(rows.map((r) => ({ ...r, title: titleMap.get(r.content_id) ?? null, thumbnail: imgMap.get(`${r.content_id}::${r.channel}`) ?? null })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [orgId]);

  async function cancel(id: string) {
    setCancelling(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { error } = await sb.from('content_schedules').update({ publish_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      setItems((arr) => arr.filter((x) => x.id !== id));
      toast.success('Đã huỷ lịch đăng');
    } catch (e) {
      toast.error('Không huỷ được: ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setCancelling(null);
    }
  }

  if (loading) return <Loading />;
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Chưa có bài nào đang chờ đăng.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {items.map((it) => (
        <Card key={it.id}>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              {it.thumbnail ? (
                <img src={it.thumbnail} alt="" className="w-16 h-16 rounded-md object-cover border border-border shrink-0" loading="lazy" />
              ) : (
                <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <CalendarClock className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium line-clamp-2">{it.title || 'Bài viết'}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] capitalize">{it.channel}</Badge>
                  <span>{formatDateTime(it.scheduled_at)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {it.publish_status === 'publishing' ? '⏳ Đang đăng…' : '🕒 Đã lên lịch'}
                </div>
              </div>
              <Button size="sm" variant="ghost" disabled={cancelling === it.id || it.publish_status === 'publishing'} onClick={() => cancel(it.id)} className="shrink-0">
                {cancelling === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
