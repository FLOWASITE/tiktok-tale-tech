import { useEffect, useState } from 'react';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LayoutDashboard, Plus, CheckSquare, AlertCircle, Sparkles, Palette, Crown, Check } from 'lucide-react';

type Tab = 'dashboard' | 'create' | 'approve' | 'brands';

type TelegramMiniApp = {
  initDataUnsafe?: { user?: { id?: number } };
  HapticFeedback?: { notificationOccurred?: (type: 'success' | 'error' | 'warning') => void };
};

function getTelegramMiniApp(): TelegramMiniApp | undefined {
  return window.Telegram?.WebApp as TelegramMiniApp | undefined;
}

export default function TelegramApp() {
  const { ready, authenticated, loading, error, errorCode, userId, organizationId } = useTelegramWebApp();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Read intent from hash route (e.g. #/multichannel/<id> from "Xem & duyệt" button).
  // We don't have a real router inside the Mini App yet, so for now hash paths that
  // mention approval flows just open the Approve tab.
  useEffect(() => {
    if (!authenticated) return;
    const hash = window.location.hash || '';
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
    // Distinguish between (a) session OK but org chưa resolve, (b) thật sự fail auth,
    // và (c) các lỗi backend cụ thể (not_linked, ambiguous_org, ...).
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
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">Flowa</h1>
          <Badge variant="secondary" className="ml-auto text-xs">Mini App</Badge>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'dashboard' && <DashboardTab orgId={organizationId} userId={userId} />}
        {tab === 'create' && <CreateTab orgId={organizationId} userId={userId} onDone={() => setTab('dashboard')} />}
        {tab === 'approve' && <ApproveTab orgId={organizationId} />}
        {tab === 'brands' && <BrandsTab orgId={organizationId} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card grid grid-cols-4">
        <NavBtn active={tab === 'dashboard'} icon={<LayoutDashboard className="w-5 h-5" />} label="Tổng quan" onClick={() => setTab('dashboard')} />
        <NavBtn active={tab === 'create'} icon={<Plus className="w-5 h-5" />} label="Tạo" onClick={() => setTab('create')} />
        <NavBtn active={tab === 'brands'} icon={<Palette className="w-5 h-5" />} label="Brand" onClick={() => setTab('brands')} />
        <NavBtn active={tab === 'approve'} icon={<CheckSquare className="w-5 h-5" />} label="Duyệt" onClick={() => setTab('approve')} />
      </nav>
    </div>
  );
}

function NavBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 text-xs ${active ? 'text-primary' : 'text-muted-foreground'}`}
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
            👋 Bấm tab <strong>Tạo</strong> để khởi chạy campaign mới, hoặc <strong>Duyệt</strong> để xem các nội dung đang chờ.
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
      // Best-effort trigger
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
function ApproveTab({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<Array<{ id: string; content_preview: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from('agent_approvals')
      .select('id, content_preview, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);
    setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [orgId]);

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id);
    try {
      await supabase.functions.invoke('agent-approve', {
        body: { approval_id: id, action, notes: 'via Telegram Mini App' },
      });
      setItems((arr) => arr.filter((x) => x.id !== id));
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
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {items.map((it) => (
        <Card key={it.id}>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm whitespace-pre-line line-clamp-6">
              {it.content_preview || '_Không có preview_'}
            </p>
            <div className="flex gap-2">
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
