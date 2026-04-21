import { useEffect, useState } from 'react';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Loader2, LayoutDashboard, Plus, CheckSquare, AlertCircle, Sparkles, Palette, Crown, Check, CalendarClock, Eye, X as XIcon } from 'lucide-react';

type Tab = 'dashboard' | 'create' | 'approve' | 'scheduled' | 'brands';

type TelegramMiniApp = {
  initDataUnsafe?: { user?: { id?: number } };
  HapticFeedback?: { notificationOccurred?: (type: 'success' | 'error' | 'warning') => void };
};

function getTelegramMiniApp(): TelegramMiniApp | undefined {
  return window.Telegram?.WebApp as TelegramMiniApp | undefined;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TelegramApp() {
  const { ready, authenticated, loading, error, errorCode, userId, organizationId } = useTelegramWebApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [deepLinkApprovalId, setDeepLinkApprovalId] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const params = new URLSearchParams(search);
    const view = params.get('view');
    const id = params.get('id');
    if (view === 'approve') {
      setTab('approve');
      if (id) setDeepLinkApprovalId(id);
      return;
    }
    if (/multichannel|approve|approval/i.test(hash)) {
      setTab('approve');
    }
  }, [authenticated]);

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
    const title = sessionOkButOrgMissing
      ? 'Chưa xác định được workspace'
      : 'Không xác thực được';

    let hint: string | null = null;
    if (errorCode === 'not_linked') {
      hint = 'Tài khoản Telegram chưa liên kết workspace. Hãy gõ /start trong DM với bot trước.';
    } else if (errorCode === 'ambiguous_org') {
      hint = 'Tài khoản đang liên kết nhiều workspace. Mở Mini App từ menu bot có gắn ?org=<id>.';
    } else if (errorCode === 'no_init_data') {
      hint = 'Hãy mở Mini App từ trong bot Telegram (không mở trực tiếp link).';
    } else if (sessionOkButOrgMissing) {
      hint = 'Đã đăng nhập Flowa nhưng chưa map được Telegram → workspace. Thử /start trong DM với bot.';
    } else if (error && /token_hash and type|Only the token_hash/i.test(error)) {
      hint = 'Bạn đang mở Mini App từ cache cũ của Telegram. Backend đã được vá để tương thích — hãy đóng hẳn Mini App (vuốt xuống/Close), rồi bấm lại nút "Xem & duyệt" hoặc menu Mở Flowa mới.';
    } else if (error && /verify|otp|expired|invalid token/i.test(error)) {
      hint = 'Không tạo được phiên đăng nhập từ Telegram. Đóng Mini App và mở lại từ bot.';
    }

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
            <p className="text-sm text-muted-foreground">
              {error || 'Hãy mở Mini App từ trong bot Telegram.'}
            </p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <div className="text-[10px] text-muted-foreground/70 font-mono pt-2 border-t border-border space-y-0.5">
              <div>auth: {String(authenticated)} · user: {userId ? '✓' : '✗'} · org: {organizationId ? '✓' : '✗'}</div>
              {errorCode && <div>code: {errorCode}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">Flowa</h1>
          <Badge variant="secondary" className="ml-auto text-xs">Mini App</Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'dashboard' && <DashboardTab orgId={organizationId} userId={userId} />}
        {tab === 'create' && <CreateTab orgId={organizationId} userId={userId} onDone={() => setTab('dashboard')} />}
        {tab === 'approve' && <ApproveTab orgId={organizationId} onScheduled={() => setTab('scheduled')} autoOpenId={deepLinkApprovalId} onAutoOpened={() => setDeepLinkApprovalId(null)} />}
        {tab === 'scheduled' && <ScheduledTab orgId={organizationId} />}
        {tab === 'brands' && <BrandsTab orgId={organizationId} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card grid grid-cols-5">
        <NavBtn active={tab === 'dashboard'} icon={<LayoutDashboard className="w-5 h-5" />} label="Tổng quan" onClick={() => setTab('dashboard')} />
        <NavBtn active={tab === 'create'} icon={<Plus className="w-5 h-5" />} label="Tạo" onClick={() => setTab('create')} />
        <NavBtn active={tab === 'brands'} icon={<Palette className="w-5 h-5" />} label="Brand" onClick={() => setTab('brands')} />
        <NavBtn active={tab === 'approve'} icon={<CheckSquare className="w-5 h-5" />} label="Duyệt" onClick={() => setTab('approve')} />
        <NavBtn active={tab === 'scheduled'} icon={<CalendarClock className="w-5 h-5" />} label="Lịch" onClick={() => setTab('scheduled')} />
      </nav>
    </div>
  );
}

function NavBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 text-[11px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============= Dashboard =============
function DashboardTab({ orgId, userId }: { orgId: string; userId: string }) {
  const [data, setData] = useState<{
    pendingApprovals: number;
    runningPipelines: number;
    completedThisMonth: number;
    plan: string;
  } | null>(null);
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
          sb.from('agent_approvals').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).eq('status', 'pending'),
          sb.from('agent_pipelines').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).is('completed_at', null),
          sb.from('agent_pipelines').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).gte('completed_at', monthStart.toISOString()),
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
  }, [orgId, userId]);

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
            👋 Bấm tab <strong>Tạo</strong> để khởi chạy campaign mới, <strong>Duyệt</strong> để xem nội dung chờ, hoặc <strong>Lịch</strong> để xem bài đã lên lịch.
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

// ============= Create =============
function CreateTab({ orgId, userId, onDone }: { orgId: string; userId: string; onDone: () => void }) {
  const [brands, setBrands] = useState<Array<{ id: string; brand_name: string }>>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data } = await sb.from('brand_templates').select('id, brand_name').eq('organization_id', orgId);
      setBrands(data ?? []);
      if (data?.[0]) setBrandId(data[0].id);
    })();
  }, [orgId]);

  async function submit() {
    if (!topic.trim()) {
      setMsg('Nhập mô tả trước nhé.');
      return;
    }
    setSubmitting(true);
    setMsg(null);
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
      setMsg('✅ Đã tạo. Pipeline sẽ chạy nền.');
      setTopic('');
      void supabase.functions.invoke('agent-pipeline', {
        body: { action: 'trigger_from_goal', goal_id: goal.id, organization_id: orgId },
      });
      setTimeout(onDone, 1200);
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold">Tạo campaign nhanh</h2>
      <div>
        <label className="text-sm text-muted-foreground">Brand</label>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {brands.length === 0 && <option value="">— Chưa có brand —</option>}
          {brands.map((b) => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Mô tả campaign</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={4}
          placeholder="VD: tạo campaign Tết cho spa làm đẹp, target nữ 25-40"
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Tạo & chạy
      </Button>
      {msg && <p className="text-sm text-center text-muted-foreground">{msg}</p>}
    </div>
  );
}

// ============= Approve =============
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

function ApproveTab({ orgId, onScheduled, autoOpenId, onAutoOpened }: { orgId: string; onScheduled: () => void; autoOpenId?: string | null; onAutoOpened?: () => void }) {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ApprovalItem | null>(null);
  const [previewImages, setPreviewImages] = useState<ImageRow[]>([]);
  const [previewFullText, setPreviewFullText] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

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
        sb.from('channel_image_history')
          .select('image_url, channel, is_selected, version')
          .eq('content_id', it.content_id)
          .order('version', { ascending: false })
          .limit(20),
        sb.from('multi_channel_contents')
          .select('channel_versions')
          .eq('id', it.content_id)
          .maybeSingle(),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imgs: ImageRow[] = (imgsRes.data ?? []).filter((r: any) => r.image_url);
      // dedupe by channel preferring is_selected
      const byChannel = new Map<string, ImageRow>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imgsRes.data ?? []).forEach((r: any) => {
        if (!r.image_url) return;
        if (!byChannel.has(r.channel) || r.is_selected) {
          byChannel.set(r.channel, { image_url: r.image_url, channel: r.channel });
        }
      });
      setPreviewImages(Array.from(byChannel.values()).slice(0, 6));
      // pull longest channel text as full preview
      const cv = contentRes.data?.channel_versions || {};
      let longest = '';
      for (const k of Object.keys(cv)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v: any = cv[k];
        const txt = typeof v === 'string' ? v : (v?.content || v?.text || v?.body || '');
        if (typeof txt === 'string' && txt.length > longest.length) longest = txt;
      }
      setPreviewFullText(longest || it.content_preview || '');
    } catch (e) {
      console.error('[telegram-app] preview load failed', e);
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
      setPreviewItem(null);

      if (action === 'reject') {
        toast.success('Đã từ chối — pipeline trả về sáng tạo');
        return;
      }

      const sched = target?.scheduled_publish_at;
      const channels = target?.selected_channels?.length ? ` • ${target.selected_channels.join(', ')}` : '';
      if (sched) {
        const when = formatDateTime(sched);
        toast.success(`Đã duyệt. Sẽ đăng lúc ${when}${channels}`, {
          action: { label: 'Xem lịch', onClick: () => onScheduled() },
        });
      } else {
        toast.success(`Đã duyệt — pipeline tiếp tục${channels}`, {
          action: { label: 'Xem lịch', onClick: () => onScheduled() },
        });
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
        <Button variant="outline" size="sm" className="mt-4" onClick={onScheduled}>
          <CalendarClock className="w-4 h-4 mr-2" /> Xem bài đã lên lịch
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        {items.map((it) => (
          <Card key={it.id}>
            <CardContent className="pt-4 space-y-3">
              {it.content_title && (
                <div className="text-xs font-medium text-foreground/80 line-clamp-1">{it.content_title}</div>
              )}
              <p className="text-sm whitespace-pre-line line-clamp-6">
                {it.content_preview || '_Không có preview_'}
              </p>
              {it.scheduled_publish_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Sẽ đăng: {formatDateTime(it.scheduled_publish_at)}
                    {it.selected_channels?.length ? ` • ${it.selected_channels.join(', ')}` : ''}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm" variant="ghost"
                  disabled={acting === it.id}
                  onClick={() => openPreview(it)}
                >
                  <Eye className="w-4 h-4 mr-1" /> Xem
                </Button>
                <Button
                  size="sm" variant="outline" className="flex-1"
                  disabled={acting === it.id}
                  onClick={() => act(it.id, 'reject')}
                >
                  ❌ Từ chối
                </Button>
                <Button
                  size="sm" className="flex-1"
                  disabled={acting === it.id}
                  onClick={() => act(it.id, 'approve')}
                >
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
            <DrawerTitle className="text-base line-clamp-2">
              {previewItem?.content_title || 'Xem nội dung đầy đủ'}
            </DrawerTitle>
            {previewItem?.scheduled_publish_at && (
              <DrawerDescription className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" />
                Sẽ đăng: {formatDateTime(previewItem.scheduled_publish_at)}
                {previewItem.selected_channels?.length ? ` • ${previewItem.selected_channels.join(', ')}` : ''}
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
              <div className="text-sm whitespace-pre-line text-foreground/90">
                {previewFullText || '_Không có nội dung_'}
              </div>
            )}
            {previewItem && (
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-2">
                <Button
                  variant="outline" className="flex-1"
                  disabled={acting === previewItem.id}
                  onClick={() => act(previewItem.id, 'reject')}
                >
                  ❌ Từ chối
                </Button>
                <Button
                  className="flex-1"
                  disabled={acting === previewItem.id}
                  onClick={() => act(previewItem.id, 'approve')}
                >
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

// ============= Scheduled =============
type ScheduleRow = {
  id: string;
  scheduled_at: string;
  channel: string;
  publish_status: string;
  content_id: string;
  title?: string | null;
  thumbnail?: string | null;
};

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
      let titleMap = new Map<string, string>();
      let imgMap = new Map<string, string>();
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
      setItems(rows.map((r) => ({
        ...r,
        title: titleMap.get(r.content_id) ?? null,
        thumbnail: imgMap.get(`${r.content_id}::${r.channel}`) ?? null,
      })));
    } catch (e) {
      console.error('[telegram-app] scheduled load failed', e);
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
      const { error } = await sb.from('content_schedules')
        .update({ publish_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
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
              <Button
                size="sm" variant="ghost"
                disabled={cancelling === it.id || it.publish_status === 'publishing'}
                onClick={() => cancel(it.id)}
                className="shrink-0"
              >
                {cancelling === it.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
    </div>
  );
}

// ============= Brands =============
type BrandRow = {
  id: string;
  brand_name: string;
  is_default: boolean | null;
  primary_color: string | null;
  industry: string[] | null;
  logo_url: string | null;
};

function BrandsTab({ orgId }: { orgId: string }) {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const tg = getTelegramMiniApp();
      const chatIdRaw = tg?.initDataUnsafe?.user?.id;
      const [brandsRes, bindingRes] = await Promise.all([
        sb.from('brand_templates')
          .select('id, brand_name, is_default, primary_color, industry, logo_url')
          .eq('organization_id', orgId)
          .is('deleted_at', null)
          .order('is_default', { ascending: false })
          .order('brand_name', { ascending: true }),
        chatIdRaw
          ? sb.from('telegram_chat_bindings')
              .select('active_brand_template_id')
              .eq('organization_id', orgId)
              .eq('telegram_chat_id', chatIdRaw)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setBrands(brandsRes.data ?? []);
      setActiveId(bindingRes.data?.active_brand_template_id ?? null);
    } catch (e) {
      console.error('[telegram-app] brands load failed', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [orgId]);

  async function switchTo(brandId: string) {
    setSwitching(brandId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const tg = getTelegramMiniApp();
      const chatIdRaw = tg?.initDataUnsafe?.user?.id;
      if (!chatIdRaw) throw new Error('Không tìm được Telegram chat ID');
      const { error } = await sb.from('telegram_chat_bindings')
        .update({ active_brand_template_id: brandId })
        .eq('organization_id', orgId)
        .eq('telegram_chat_id', chatIdRaw);
      if (error) throw error;
      setActiveId(brandId);
      tg?.HapticFeedback?.notificationOccurred?.('success');
    } catch (e) {
      console.error('[telegram-app] switch brand failed', e);
    } finally {
      setSwitching(null);
    }
  }

  if (loading) return <Loading />;
  if (brands.length === 0) {
    return (
      <div className="p-6 text-center">
        <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Tổ chức chưa có brand nào.</p>
      </div>
    );
  }

  const filtered = filter
    ? brands.filter((b) => b.brand_name.toLowerCase().includes(filter.toLowerCase()))
    : brands;

  return (
    <div className="p-4 space-y-3">
      <div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="🔍 Tìm brand…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((b) => {
          const isActive = b.id === activeId;
          return (
            <button
              key={b.id}
              disabled={switching !== null}
              onClick={() => switchTo(b.id)}
              className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:bg-accent/50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
                style={{ backgroundColor: b.primary_color || 'hsl(var(--muted))' }}
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.brand_name} className="w-full h-full rounded-md object-cover" />
                ) : (
                  b.brand_name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{b.brand_name}</span>
                  {b.is_default && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                {b.industry && b.industry.length > 0 && (
                  <div className="text-xs text-muted-foreground truncate">{b.industry.join(', ')}</div>
                )}
              </div>
              {switching === b.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              ) : isActive ? (
                <Check className="w-5 h-5 text-primary shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Không khớp brand nào.</p>
      )}
    </div>
  );
}
