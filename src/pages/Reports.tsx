import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Download, RefreshCw, Heart, MessageCircle, Share2, Eye, FileDown, Sparkles, CheckCircle2, Send, FileText as FileTextIcon, Clock, AlertTriangle, History } from 'lucide-react';
import { ContentTypeBadge, type ContentType, CONTENT_TYPE_LABELS } from '@/components/reports/ContentTypeBadge';
import { ContentStatusBadge } from '@/components/reports/ContentStatusBadge';
import { ContentHistorySheet } from '@/components/reports/ContentHistorySheet';
import type { ContentRow } from '@/hooks/reports/useContentReport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar';
import { StatCard } from '@/components/reports/StatCard';
import { EmptyReportState } from '@/components/reports/EmptyReportState';
import { AIInsightsPanel } from '@/components/reports/AIInsightsPanel';
import { EngagementDateRangeControl } from '@/components/reports/EngagementDateRangeControl';
import { type BucketType, formatBucketLabel, suggestBucket } from '@/lib/reports/aggregators';
import { useReportFilters } from '@/hooks/reports/useReportFilters';
import { useReportOverview } from '@/hooks/reports/useReportOverview';
import { useContentReport } from '@/hooks/reports/useContentReport';
import { usePublishingReport } from '@/hooks/reports/usePublishingReport';
import { useEngagementReport, useTriggerEngagementSync } from '@/hooks/reports/useEngagementReport';
import { useReportInsights } from '@/hooks/reports/useReportInsights';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { buildCsv, downloadCsv } from '@/lib/reports/csvBuilder';
import { downloadReportPdf } from '@/lib/reports/pdfBuilder';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Reports() {
  const navigate = useNavigate();
  const { filters, updateFilters, resetFilters, setPresetRange, organizationId } = useReportFilters();
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'approved' | 'scheduled' | 'published' | 'failed'>('all');
  const [historyRow, setHistoryRow] = useState<ContentRow | null>(null);

  // Engagement-tab-only date range + bucket (independent from global filters)
  const [engagementOverride, setEngagementOverride] = useState<{ from: Date; to: Date } | null>(null);
  const [engagementBucket, setEngagementBucket] = useState<BucketType>('day');
  const engagementRange = engagementOverride ?? { from: filters.dateFrom, to: filters.dateTo };

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Nháp',
    approved: 'Đã duyệt',
    published: 'Đã đăng',
    partially_published: 'Đăng một phần',
  };
  const ROUTE_FOR_TYPE: Record<ContentType, (id: string) => string> = {
    multichannel: (id) => `/multichannel/${id}`,
    script: (id) => `/scripts/${id}`,
    carousel: (id) => `/carousels/${id}`,
    core: (id) => `/core-content/${id}`,
    ad_copy: (id) => `/ad-copies/${id}`,
  };

  const overview = useReportOverview(organizationId, filters);
  const content = useContentReport(organizationId, filters);
  const publishing = usePublishingReport(organizationId, filters);
  const engagement = useEngagementReport(organizationId, filters, {
    overrideRange: engagementOverride,
    bucket: engagementBucket,
  });
  const triggerSync = useTriggerEngagementSync(organizationId);

  const insightsArgs = useMemo(() => {
    if (!organizationId || !overview.data || !engagement.data || !content.data) return null;
    return {
      organizationId,
      filters,
      brandName: currentBrand?.brand_name ?? null,
      overview: overview.data,
      engagement: engagement.data,
      content: content.data,
    };
  }, [organizationId, overview.data, engagement.data, content.data, filters, currentBrand?.brand_name]);

  const insights = useReportInsights(insightsArgs);

  const overviewSeries = useMemo(() => {
    const c = content.data?.byDay ?? [];
    const p = publishing.data?.byDay ?? [];
    const map = new Map<string, { date: string; created: number; published: number; failed: number }>();
    for (const r of c) map.set(r.date, { date: r.date, created: r.value, published: 0, failed: 0 });
    for (const r of p) {
      const cur = map.get(r.date) ?? { date: r.date, created: 0, published: 0, failed: 0 };
      cur.published = r.published;
      cur.failed = r.failed;
      map.set(r.date, cur);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [content.data, publishing.data]);

  const handleExportCsv = () => {
    const headers = ['Ngày', 'Nội dung tạo', 'Đã đăng', 'Thất bại'];
    const rows = overviewSeries.map((r) => [r.date, r.created, r.published, r.failed]);
    const csv = buildCsv(headers, rows);
    downloadCsv(`bao-cao-${filters.dateFrom.toISOString().slice(0, 10)}_${filters.dateTo.toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportPdf = () => {
    try {
      downloadReportPdf({
        filters,
        workspaceName: currentOrganization?.name,
        brandName: currentBrand?.brand_name ?? null,
        overview: overview.data,
        content: content.data,
        publishing: publishing.data,
        engagement: engagement.data,
        insights: insights.data,
      }, `bao-cao-${filters.dateFrom.toISOString().slice(0, 10)}_${filters.dateTo.toISOString().slice(0, 10)}.pdf`);
      toast.success('Đã xuất PDF');
    } catch (e) {
      toast.error(`Lỗi xuất PDF: ${(e as Error).message}`);
    }
  };

  if (!organizationId) {
    return (
      <div className="container py-8">
        <EmptyReportState title="Chưa chọn workspace" description="Vui lòng chọn một workspace để xem báo cáo." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Báo cáo | Flowa</title>
        <meta name="description" content="Báo cáo nội dung, publishing và engagement trong workspace." />
      </Helmet>

      <div className="container space-y-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Báo cáo</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Xuất báo cáo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileDown className="mr-2 h-4 w-4" /> PDF (đầy đủ)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" /> CSV (dữ liệu thô)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ReportFiltersBar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          onPreset={setPresetRange}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Nội dung tạo"
            value={overview.data?.contentCreated ?? 0}
            delta={overview.data?.contentDelta}
            loading={overview.isLoading}
          />
          <StatCard
            label="Đã xuất bản"
            value={overview.data?.publishedCount ?? 0}
            delta={overview.data?.publishedDelta}
            loading={overview.isLoading}
            tone="positive"
          />
          <StatCard
            label="Thất bại"
            value={overview.data?.failedCount ?? 0}
            loading={overview.isLoading}
            tone={overview.data && overview.data.failedCount > 0 ? 'negative' : 'default'}
          />
          <StatCard
            label="Engagement"
            value={overview.data?.engagementTotal ?? 0}
            hint={`${overview.data?.activeChannels ?? 0} channel hoạt động`}
            loading={overview.isLoading}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Hoạt động theo ngày</h3>
              {overviewSeries.length === 0 ? (
                <EmptyReportState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={overviewSeries}>
                    <defs>
                      <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gPublished" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="created" stroke="hsl(var(--primary))" fill="url(#gCreated)" name="Tạo" />
                    <Area type="monotone" dataKey="published" stroke="hsl(142 76% 36%)" fill="url(#gPublished)" name="Đã đăng" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            {/* KPI cards riêng cho tab Nội dung */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard
                label="Tổng nội dung"
                value={content.data?.total ?? 0}
                hint={`${content.data?.byType.length ?? 0} loại`}
                loading={content.isLoading}
              />
              <StatCard
                label="Nháp"
                value={(content.data?.byStatus.find((s) => s.status === 'draft')?.count) ?? 0}
                loading={content.isLoading}
              />
              <StatCard
                label="Đã lên lịch"
                value={content.data?.funnel.scheduled ?? 0}
                hint="Chờ đăng"
                loading={content.isLoading}
              />
              <StatCard
                label="Đã đăng"
                value={content.data?.funnel.published ?? 0}
                tone="positive"
                loading={content.isLoading}
              />
              <StatCard
                label="Thất bại"
                value={content.data?.funnel.failed ?? 0}
                tone={content.data && content.data.funnel.failed > 0 ? 'negative' : 'default'}
                loading={content.isLoading}
              />
            </div>

            {/* Stacked bar: loại × trạng thái */}
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Loại nội dung × trạng thái</h3>
              {!content.data?.byTypeStatus.length ? (
                <EmptyReportState />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={content.data.byTypeStatus}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="typeLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="draft" stackId="s" fill="hsl(var(--muted-foreground))" name="Nháp" />
                    <Bar dataKey="approved" stackId="s" fill="hsl(217 91% 60%)" name="Đã duyệt" />
                    <Bar dataKey="scheduled" stackId="s" fill="hsl(38 92% 50%)" name="Đã lên lịch" />
                    <Bar dataKey="partially_published" stackId="s" fill="hsl(142 60% 45%)" name="Đăng một phần" />
                    <Bar dataKey="published" stackId="s" fill="hsl(142 76% 36%)" name="Đã đăng" />
                    <Bar dataKey="failed" stackId="s" fill="hsl(0 84% 60%)" name="Thất bại" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">Theo channel</h3>
                {!content.data?.byChannel.length ? (
                  <EmptyReportState />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={content.data.byChannel}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">Theo brand</h3>
                {!content.data?.byBrand.length ? (
                  <EmptyReportState />
                ) : (
                  <ul className="space-y-2.5">
                    {content.data.byBrand.slice(0, 8).map((b) => {
                      const max = content.data!.byBrand[0].count;
                      const pct = max > 0 ? (b.count / max) * 100 : 0;
                      return (
                        <li key={b.brand} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate">{b.brand}</span>
                            <Badge variant="secondary">{b.count}</Badge>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top topics */}
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">Top chủ đề</h3>
                {!content.data?.topTopics.length ? (
                  <EmptyReportState description="Chưa có chủ đề nào trong khoảng này." />
                ) : (
                  <ol className="space-y-2">
                    {content.data.topTopics.map((t, i) => (
                      <li key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="truncate">{t.topic}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{t.count}</Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              {/* Funnel */}
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">Funnel chuyển đổi</h3>
                {!content.data || content.data.total === 0 ? (
                  <EmptyReportState />
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: 'Đã tạo', value: content.data.funnel.created, icon: FileTextIcon, base: content.data.funnel.created },
                      { label: 'Đã duyệt', value: content.data.funnel.approved, icon: CheckCircle2, base: content.data.funnel.created },
                      { label: 'Đã lên lịch', value: content.data.funnel.scheduled, icon: Clock, base: content.data.funnel.created },
                      { label: 'Đã đăng', value: content.data.funnel.published, icon: Send, base: content.data.funnel.created },
                      { label: 'Thất bại', value: content.data.funnel.failed, icon: AlertTriangle, base: content.data.funnel.created },
                    ].map((step) => {
                      const pct = step.base > 0 ? Math.round((step.value / step.base) * 100) : 0;
                      const Icon = step.icon;
                      return (
                        <div key={step.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{step.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="tabular-nums font-medium">{step.value.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Bảng chi tiết với filter */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                <h3 className="text-sm font-medium">Chi tiết nội dung</h3>
                <Select value={contentTypeFilter} onValueChange={(v) => setContentTypeFilter(v as ContentType | 'all')}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Tất cả loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {CONTENT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(content.data?.rows ?? [])
                    .filter((r) => contentTypeFilter === 'all' || r.type === contentTypeFilter)
                    .slice(0, 100)
                    .map((r) => (
                      <TableRow
                        key={`${r.type}-${r.id}`}
                        className="cursor-pointer"
                        onClick={() => navigate(ROUTE_FOR_TYPE[r.type](r.id))}
                      >
                        <TableCell><ContentTypeBadge type={r.type} /></TableCell>
                        <TableCell className="max-w-md truncate font-medium">{r.title}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                          {r.brand_name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === 'published'
                                ? 'default'
                                : r.status === 'partially_published'
                                ? 'secondary'
                                : r.status === 'approved'
                                ? 'outline'
                                : 'secondary'
                            }
                            className="font-normal"
                          >
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.channels.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {r.channels.slice(0, 3).map((c) => (
                                <Badge key={c} variant="outline" className="text-xs font-normal">
                                  {c}
                                </Badge>
                              ))}
                              {r.channels.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{r.channels.length - 3}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: vi })}
                        </TableCell>
                      </TableRow>
                    ))}
                  {(content.data?.rows ?? []).filter((r) => contentTypeFilter === 'all' || r.type === contentTypeFilter)
                    .length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        Không có nội dung trong khoảng này.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="publishing" className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Publishing theo channel</h3>
              {!publishing.data?.byChannel.length ? (
                <EmptyReportState />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={publishing.data.byChannel}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="published" stackId="a" fill="hsl(142 76% 36%)" name="Đã đăng" />
                    <Bar dataKey="failed" stackId="a" fill="hsl(0 84% 60%)" name="Thất bại" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(publishing.data?.rows ?? []).slice(0, 50).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={r.action === 'published' ? 'default' : r.action === 'failed' ? 'destructive' : 'secondary'}>
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.performed_at), 'dd/MM/yy HH:mm', { locale: vi })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-rose-600">{r.error}</TableCell>
                    </TableRow>
                  ))}
                  {(publishing.data?.rows ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Chưa có log publishing.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            {/* Sync controls */}
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Engagement metrics</p>
                <p className="text-xs text-muted-foreground">
                  {engagement.data?.lastSyncedAt
                    ? `Cập nhật ${formatDistanceToNow(new Date(engagement.data.lastSyncedAt), { addSuffix: true, locale: vi })}`
                    : 'Chưa có dữ liệu sync. Tự động chạy mỗi 6 giờ.'}
                  {' · '}
                  Theo dõi {engagement.data?.postsTracked ?? 0} bài
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={triggerSync.isPending}
                onClick={() => {
                  triggerSync.mutate(undefined, {
                    onSuccess: (r) => toast.success(`Đã sync ${r.success}/${r.total} bài`),
                    onError: (e) => toast.error(`Lỗi sync: ${(e as Error).message}`),
                  });
                }}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                Sync ngay
              </Button>
            </Card>

            {/* Per-tab date range + bucket */}
            <EngagementDateRangeControl
              range={engagementRange}
              bucket={engagementBucket}
              onRangeChange={(r) => {
                setEngagementOverride(r);
                setEngagementBucket(suggestBucket(r.from, r.to));
              }}
              onBucketChange={setEngagementBucket}
              onSyncWithGlobal={() => {
                setEngagementOverride(null);
                setEngagementBucket('day');
              }}
              isOverridden={engagementOverride !== null}
            />

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Reach" value={engagement.data?.totalReach ?? 0} loading={engagement.isLoading} />
              <StatCard label="Impressions" value={engagement.data?.totalImpressions ?? 0} loading={engagement.isLoading} />
              <StatCard label="Likes" value={engagement.data?.totalLikes ?? 0} loading={engagement.isLoading} tone="positive" />
              <StatCard
                label="Engagement rate"
                value={`${engagement.data?.engagementRate ?? 0}%`}
                hint={`${engagement.data?.totalComments ?? 0} comments · ${engagement.data?.totalShares ?? 0} shares`}
                loading={engagement.isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">
                  Reach & Engagement {engagementBucket === 'day' ? 'theo ngày' : engagementBucket === 'week' ? 'theo tuần' : 'theo tháng'}
                </h3>
                {!engagement.data?.byDay.length ? (
                  <EmptyReportState />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={engagement.data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatBucketLabel(String(v), engagement.data?.bucketType ?? engagementBucket)}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        labelFormatter={(v) => formatBucketLabel(String(v), engagement.data?.bucketType ?? engagementBucket)}
                      />
                      <Line type="monotone" dataKey="reach" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Reach" />
                      <Line type="monotone" dataKey="engagement" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} name="Engagement" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="mb-3 text-sm font-medium">Theo platform</h3>
                {!engagement.data?.byPlatform.length ? (
                  <EmptyReportState />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={engagement.data.byPlatform}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="reach" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Reach" />
                      <Bar dataKey="likes" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Likes" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Post ID</TableHead>
                    <TableHead className="text-right"><Eye className="ml-auto h-3.5 w-3.5" /></TableHead>
                    <TableHead className="text-right"><Heart className="ml-auto h-3.5 w-3.5" /></TableHead>
                    <TableHead className="text-right"><MessageCircle className="ml-auto h-3.5 w-3.5" /></TableHead>
                    <TableHead className="text-right"><Share2 className="ml-auto h-3.5 w-3.5" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(engagement.data?.topPosts ?? []).map((p) => (
                    <TableRow
                      key={`${p.platform}-${p.post_id}`}
                      className={p.content_id ? 'cursor-pointer' : ''}
                      onClick={() => p.content_id && navigate(`/multichannel/${p.content_id}`)}
                    >
                      <TableCell><Badge variant="outline">{p.platform}</Badge></TableCell>
                      <TableCell className="max-w-[180px] truncate font-mono text-xs">{p.post_id}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.reach.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.likes.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.comments.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.shares.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!engagement.data?.topPosts.length && (
                    <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Chưa có dữ liệu engagement. Bấm "Sync ngay" để fetch từ platform.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <AIInsightsPanel
              data={insights.data}
              isLoading={insights.isLoading}
              isRefreshing={insights.isRefreshing}
              error={insights.error}
              onRefresh={() => insights.refresh()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
