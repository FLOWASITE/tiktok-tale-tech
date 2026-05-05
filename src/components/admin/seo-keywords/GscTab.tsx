import { useState, useMemo } from "react";
import { useGscConnections, useGscMetrics } from "@/hooks/useGscConnections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, RefreshCw, Trash2, Globe, MousePointerClick, Eye, TrendingUp, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function GscTab() {
  const { connections, startOAuth, sync, disconnect } = useGscConnections();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conns = connections.data || [];
  const activeId = selectedId || conns[0]?.id || null;
  const metrics = useGscMetrics(activeId, 28);

  const summary = useMemo(() => {
    const rows = metrics.data || [];
    if (!rows.length) return { impressions: 0, clicks: 0, ctr: 0, position: 0 };
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const position = rows.reduce((s, r) => s + r.position * r.impressions, 0) / Math.max(1, impressions);
    return { impressions, clicks, ctr, position };
  }, [metrics.data]);

  const dailySeries = useMemo(() => {
    const rows = metrics.data || [];
    const byDate = new Map<string, { date: string; clicks: number; impressions: number }>();
    rows.forEach(r => {
      const cur = byDate.get(r.date) || { date: r.date, clicks: 0, impressions: 0 };
      cur.clicks += r.clicks; cur.impressions += r.impressions;
      byDate.set(r.date, cur);
    });
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [metrics.data]);

  const topQueries = useMemo(() => {
    const rows = metrics.data || [];
    const byQuery = new Map<string, { query: string; clicks: number; impressions: number; position: number; weighted: number }>();
    rows.forEach(r => {
      if (!r.query) return;
      const cur = byQuery.get(r.query) || { query: r.query, clicks: 0, impressions: 0, position: 0, weighted: 0 };
      cur.clicks += r.clicks; cur.impressions += r.impressions;
      cur.weighted += r.position * r.impressions;
      byQuery.set(r.query, cur);
    });
    return Array.from(byQuery.values())
      .map(q => ({ ...q, position: q.impressions > 0 ? q.weighted / q.impressions : 0, ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0 }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25);
  }, [metrics.data]);

  if (connections.isLoading) {
    return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!conns.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Chưa kết nối Google Search Console</CardTitle>
          <CardDescription>Kết nối GSC để theo dõi impressions, clicks, CTR và vị trí thực tế từ Google.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => startOAuth.mutate(window.location.href)} disabled={startOAuth.isPending}>
            <Plus className="h-4 w-4 mr-1.5" /> {startOAuth.isPending ? "Đang mở…" : "Kết nối GSC"}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Nếu chưa cấu hình OAuth Client, vào <strong>Admin → Social Settings → Google Search Console</strong> để nhập Client ID/Secret.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection picker */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Site GSC</label>
          <Select value={activeId || undefined} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[360px]"><SelectValue placeholder="Chọn site" /></SelectTrigger>
            <SelectContent>
              {conns.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-mono text-xs">{c.site_url}</span>
                  {c.google_email && <span className="text-muted-foreground ml-2">· {c.google_email}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => sync.mutate(activeId ? [activeId] : undefined)} disabled={sync.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${sync.isPending ? 'animate-spin' : ''}`} />
            Đồng bộ
          </Button>
          <Button variant="outline" size="sm" onClick={() => startOAuth.mutate(window.location.href)} disabled={startOAuth.isPending}>
            <Plus className="h-4 w-4 mr-1.5" /> Thêm site
          </Button>
          {activeId && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("Ngắt kết nối site này?")) disconnect.mutate(activeId); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Last synced */}
      {activeId && (
        <p className="text-xs text-muted-foreground">
          {(() => {
            const conn = conns.find(c => c.id === activeId);
            return conn?.last_synced_at
              ? `Đồng bộ lần cuối ${formatDistanceToNow(new Date(conn.last_synced_at), { addSuffix: true, locale: vi })}`
              : "Chưa đồng bộ lần nào — bấm Đồng bộ để pull dữ liệu.";
          })()}
        </p>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="Impressions" value={summary.impressions.toLocaleString()} />
        <KpiCard icon={MousePointerClick} label="Clicks" value={summary.clicks.toLocaleString()} />
        <KpiCard icon={TrendingUp} label="CTR" value={`${summary.ctr.toFixed(2)}%`} />
        <KpiCard icon={Globe} label="Position" value={summary.position.toFixed(1)} />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Xu hướng 28 ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.isLoading ? <Skeleton className="h-48 w-full" /> : dailySeries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Chưa có dữ liệu — bấm Đồng bộ.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySeries}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="impressions" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top queries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Top truy vấn</CardTitle>
          <CardDescription>25 query có nhiều impressions nhất 28 ngày qua</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {metrics.isLoading ? <Skeleton className="h-48 w-full" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Pos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topQueries.map(q => (
                  <TableRow key={q.query}>
                    <TableCell className="font-medium max-w-md truncate">{q.query}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.ctr.toFixed(1)}%</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge variant={q.position <= 10 ? "default" : "outline"}>{q.position.toFixed(1)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {topQueries.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
