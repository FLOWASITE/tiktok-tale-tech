import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';
import { CreditCard, AlertTriangle, ArrowUpRight, Package, TrendingUp, Sparkles, Infinity as InfinityIcon, Building2, Users, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscriptionReport, type QuotaItem, type BrandUsageRow, type UserUsageRow } from '@/hooks/reports/useSubscriptionReport';
import { getPlanBadge } from '@/lib/plan-badge';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';
import { AddonPurchaseDialog } from '@/components/AddonPurchaseDialog';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { EmptyReportState } from '@/components/reports/EmptyReportState';

function statusBadge(q: QuotaItem) {
  if (q.status === 'unlimited') return <Badge variant="outline" className="gap-1"><InfinityIcon className="h-3 w-3" /> Không giới hạn</Badge>;
  if (q.status === 'exhausted') return <Badge variant="destructive">Đã hết</Badge>;
  if (q.status === 'critical') return <Badge variant="destructive" className="bg-destructive/80">Sắp hết</Badge>;
  if (q.status === 'warning') return <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Cảnh báo</Badge>;
  return <Badge variant="secondary">Ổn</Badge>;
}

function progressColor(q: QuotaItem) {
  if (q.status === 'exhausted' || q.status === 'critical') return 'bg-destructive';
  if (q.status === 'warning') return 'bg-amber-500';
  return 'bg-primary';
}

interface BreakdownRowProps {
  label: string;
  total: number;
  maxTotal: number;
  scripts: number;
  carousels: number;
  multichannel: number;
  images: number;
  leading?: React.ReactNode;
}

function BreakdownRow({ label, total, maxTotal, scripts, carousels, multichannel, images, leading }: BreakdownRowProps) {
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  return (
    <TooltipProvider delayDuration={150}>
      <UITooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors cursor-default">
            {leading}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate">{label}</span>
                <span className="text-sm tabular-nums text-muted-foreground shrink-0">{total.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="end" className="text-xs">
          <div className="space-y-0.5">
            <div className="flex justify-between gap-4"><span>Scripts</span><span className="tabular-nums font-medium">{scripts}</span></div>
            <div className="flex justify-between gap-4"><span>Carousels</span><span className="tabular-nums font-medium">{carousels}</span></div>
            <div className="flex justify-between gap-4"><span>Đa kênh</span><span className="tabular-nums font-medium">{multichannel}</span></div>
            <div className="flex justify-between gap-4"><span>Ảnh AI</span><span className="tabular-nums font-medium">{images}</span></div>
          </div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
}

export function SubscriptionReportTab() {
  const navigate = useNavigate();
  const { data, activeAddons, isLoading } = useSubscriptionReport();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">Đang tải báo cáo gói...</Card>
    );
  }

  if (!data.hasSubscription) {
    return (
      <Card className="p-8 text-center space-y-3">
        <CreditCard className="h-10 w-10 mx-auto text-muted-foreground" />
        <div>
          <p className="font-medium">Chưa có gói đăng ký</p>
          <p className="text-sm text-muted-foreground mt-1">Workspace này chưa kích hoạt subscription nào.</p>
        </div>
        <Button onClick={() => navigate('/pricing')}>Xem các gói</Button>
      </Card>
    );
  }

  const planBadge = getPlanBadge(data.planType);

  return (
    <div className="space-y-4">
      {/* Plan header */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Gói hiện tại</span>
              <Badge variant="outline" className={cn('font-semibold', planBadge.className)}>{planBadge.label}</Badge>
              {data.status && data.status !== 'active' && (
                <Badge variant="outline" className="text-xs">{data.status}</Badge>
              )}
            </div>
            {data.periodStart && data.periodEnd && (
              <p className="text-sm">
                Chu kỳ:{' '}
                <span className="font-medium">
                  {format(data.periodStart, 'dd/MM/yyyy', { locale: vi })} → {format(data.periodEnd, 'dd/MM/yyyy', { locale: vi })}
                </span>
                <span className="text-muted-foreground ml-2">
                  (đã qua {data.daysElapsedInPeriod}/{data.totalDaysInPeriod} ngày, còn {data.daysRemainingInPeriod} ngày)
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddonOpen(true)}>
              <Package className="h-4 w-4 mr-1" /> Mua thêm lượt
            </Button>
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              Nâng cấp <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quota cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.quotas.map((q) => (
          <Card
            key={q.key}
            className={cn(
              'p-4 border transition-colors',
              q.status === 'exhausted' && 'border-destructive/40 bg-destructive/5',
              q.status === 'critical' && 'border-destructive/30 bg-destructive/5',
              q.status === 'warning' && 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10',
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{q.label}</p>
              {statusBadge(q)}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{q.used.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">
                / {q.limit === -1 ? '∞' : q.limit.toLocaleString()}
              </span>
            </div>
            {q.limit !== -1 && (
              <div className="mt-2 space-y-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn('h-full transition-all', progressColor(q))} style={{ width: `${Math.min(100, q.pct)}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {q.pct}% • Còn {q.remaining.toLocaleString()}
                </p>
              </div>
            )}
            {q.projectedExhaustionDate && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Dự kiến cạn {format(q.projectedExhaustionDate, 'dd/MM', { locale: vi })}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Cảnh báo hạn mức</p>
              <ul className="text-sm space-y-1">
                {data.warnings.map((w) => (
                  <li key={w.key} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{w.label}:</span> {w.used}/{w.limit} ({w.pct}%)
                    {w.projectedExhaustionDate && (
                      <> – dự kiến cạn {format(w.projectedExhaustionDate, 'dd/MM/yyyy', { locale: vi })}</>
                    )}
                    {w.status === 'exhausted' && ' – đã hết, mua thêm để tiếp tục'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Daily usage chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Tiêu thụ theo ngày trong chu kỳ</h3>
          <span className="text-xs text-muted-foreground">{data.dailySeries.length} ngày</span>
        </div>
        {data.dailySeries.length === 0 ? (
          <EmptyReportState />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => format(new Date(d), 'dd/MM', { locale: vi })}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(d: string) => format(new Date(d), 'dd/MM/yyyy', { locale: vi })}
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="scripts" name="Scripts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="carousels" name="Carousels" stroke="hsl(var(--chart-2, 142 76% 36%))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="multichannel" name="Đa kênh" stroke="hsl(var(--chart-3, 32 95% 44%))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="images" name="Ảnh AI" stroke="hsl(var(--chart-4, 280 70% 50%))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Image breakdown by channel */}
      {data.imageChannelBreakdown.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Top kênh tiêu thụ Ảnh AI</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.imageChannelBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Breakdown by brand & user */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Tiêu thụ theo Brand
          </h3>
          {data.brandUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu trong chu kỳ này.</p>
          ) : (
            <div className="space-y-0.5">
              {(() => {
                const max = data.brandUsage[0]?.total || 1;
                return data.brandUsage.map((b: BrandUsageRow) => (
                  <BreakdownRow
                    key={b.brandId}
                    label={b.brandName}
                    total={b.total}
                    maxTotal={max}
                    scripts={b.scripts}
                    carousels={b.carousels}
                    multichannel={b.multichannel}
                    images={b.images}
                    leading={
                      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    }
                  />
                ));
              })()}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Tiêu thụ theo Thành viên
          </h3>
          {data.userUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có dữ liệu trong chu kỳ này.</p>
          ) : (
            <div className="space-y-0.5">
              {(() => {
                const max = data.userUsage[0]?.total || 1;
                return data.userUsage.map((u: UserUsageRow) => (
                  <BreakdownRow
                    key={u.userId}
                    label={u.fullName}
                    total={u.total}
                    maxTotal={max}
                    scripts={u.scripts}
                    carousels={u.carousels}
                    multichannel={u.multichannel}
                    images={u.images}
                    leading={
                      <Avatar className="h-7 w-7 shrink-0">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.fullName} />}
                        <AvatarFallback className="text-[10px]">{getInitials(u.fullName)}</AvatarFallback>
                      </Avatar>
                    }
                  />
                ));
              })()}
            </div>
          )}
        </Card>
      </div>

      {/* Active addons */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Addon đang hoạt động
          </h3>
          <Button variant="outline" size="sm" onClick={() => setAddonOpen(true)}>
            <Package className="h-4 w-4 mr-1" /> Mua thêm
          </Button>
        </div>
        {activeAddons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chưa mua addon nào trong chu kỳ này.</p>
        ) : (
          <ul className="space-y-2">
            {activeAddons.map((addon) => {
              const expiresAt = new Date(addon.expires_at);
              const daysLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 86400000));
              const expiringSoon = daysLeft <= 7;
              const addonBadge = getPlanBadge(addon.plan_type);
              return (
                <li key={addon.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('font-semibold text-xs', addonBadge.className)}>
                        Addon {addonBadge.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {addon.billing_cycle === 'yearly' ? 'Năm' : 'Tháng'} • {addon.amount.toLocaleString()} ₫
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mua {format(new Date(addon.purchased_at), 'dd/MM/yyyy', { locale: vi })} • Hết hạn {format(expiresAt, 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                  {expiringSoon ? (
                    <Badge variant="destructive" className="text-xs">Còn {daysLeft} ngày</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Còn {daysLeft} ngày</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <AddonPurchaseDialog open={addonOpen} onOpenChange={setAddonOpen} />
    </div>
  );
}
