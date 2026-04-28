import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Download, RefreshCw, Heart, MessageCircle, Share2, Eye, FileDown, Sparkles } from 'lucide-react';
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

  const overview = useReportOverview(organizationId, filters);
  const content = useContentReport(organizationId, filters);
  const publishing = usePublishingReport(organizationId, filters);
  const engagement = useEngagementReport(organizationId, filters);
  const triggerSync = useTriggerEngagementSync(organizationId);

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
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" /> Xuất CSV
          </Button>
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
                  <ul className="space-y-2">
                    {content.data.byBrand.slice(0, 8).map((b) => (
                      <li key={b.brand} className="flex items-center justify-between text-sm">
                        <span className="truncate">{b.brand}</span>
                        <Badge variant="secondary">{b.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(content.data?.rows ?? []).slice(0, 50).map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/multichannel/${r.id}`)}>
                      <TableCell className="max-w-md truncate font-medium">{r.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.channels.slice(0, 4).map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                          {r.channels.length > 4 && <span className="text-xs text-muted-foreground">+{r.channels.length - 4}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: vi })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(content.data?.rows ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Không có nội dung trong khoảng này.</TableCell></TableRow>
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
                <h3 className="mb-3 text-sm font-medium">Reach & Engagement theo ngày</h3>
                {!engagement.data?.byDay.length ? (
                  <EmptyReportState />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={engagement.data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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
        </Tabs>
      </div>
    </>
  );
}
