import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Copy, ExternalLink, Download, Info, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { ChannelIcon } from "@/components/multichannel/streaming/ChannelIcon";
import { useBacklinks, useBacklinkStats, isLongformPlatform, type BacklinkRow, type BacklinksFilter } from "@/hooks/useBacklinks";
import BacklinksFilters from "./BacklinksFilters";
import BacklinkDetailSheet from "./BacklinkDetailSheet";

interface Props { embedded?: boolean }

export default function BacklinksTab({ embedded = false }: Props) {
  const [filters, setFilters] = useState<BacklinksFilter>({ page: 0, pageSize: 50 });
  const [selected, setSelected] = useState<BacklinkRow | null>(null);
  const { data, isLoading } = useBacklinks(filters);
  const { data: stats } = useBacklinkStats();

  const platforms = useMemo(
    () => Object.keys(stats?.byPlatform ?? {}).sort(),
    [stats]
  );

  const copy = (txt: string, msg = "Đã copy URL") => {
    navigator.clipboard.writeText(txt);
    toast.success(msg);
  };

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = ["Title", "Platform", "Channel", "URL", "Status", "PublishedAt"];
    const rows = data.rows.map((r) => [
      (r.title || "").replace(/"/g, '""'),
      r.platform, r.channel || "", r.external_post_url, r.status,
      new Date(r.attempted_at).toISOString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlinks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${rows.length} backlinks`);
  };

  const copyAllUrls = () => {
    if (!data?.rows.length) return;
    const txt = data.rows.map((r) => r.external_post_url).join("\n");
    copy(txt, `Đã copy ${data.rows.length} URL`);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const goPage = (delta: number) =>
    setFilters((f) => ({ ...f, page: Math.max(0, Math.min(totalPages - 1, (f.page ?? 0) + delta)) }));

  return (
    <div className="space-y-4">
      {/* KPI strip — hide when embedded inside LinksWorkspace (already shows unified KPIs) */}
      {!embedded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={<Link2 className="h-4 w-4" />} label="Tổng backlinks" value={stats?.total ?? 0} />
          <Kpi icon={<FileText className="h-4 w-4" />} label="Long-form (SEO cao)"
               value={Object.entries(stats?.byPlatform ?? {})
                 .filter(([p]) => isLongformPlatform(p))
                 .reduce((s, [, v]) => s + v, 0)} />
          <Kpi icon={<ExternalLink className="h-4 w-4" />} label="7 ngày qua" value={stats?.last7 ?? 0} />
          <Kpi icon={<Info className="h-4 w-4" />} label="Lỗi" value={stats?.byStatus?.failed ?? 0}
               tone={stats?.byStatus?.failed ? "warn" : "default"} />
        </div>
      )}

      {/* Filters + bulk actions */}
      <Card>
        <CardContent className="p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <BacklinksFilters value={filters} onChange={setFilters} platforms={platforms} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyAllUrls} disabled={!data?.rows.length}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy URL
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.rows.length}>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[28%]">Tiêu đề</TableHead>
                <TableHead className="w-[120px]">Platform</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-[100px]">Trạng thái</TableHead>
                <TableHead className="w-[140px]">Ngày publish</TableHead>
                <TableHead className="w-[140px] text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isLoading && (data?.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Chưa có backlink nào. Hãy publish bài viết lên các kênh social/website.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data?.rows ?? []).map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">
                    {r.title || <span className="text-muted-foreground italic text-xs">(no title)</span>}
                    {isLongformPlatform(r.platform) && (
                      <Badge variant="secondary" className="ml-2 text-[10px] py-0 h-4">Long-form</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon channel={r.platform} className="h-4 w-4" />
                      <span className="text-xs capitalize">{r.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <a href={r.external_post_url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-primary hover:underline truncate block max-w-[320px]"
                       title={r.external_post_url}>
                      {r.external_post_url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "success" ? "outline" : "destructive"} className="text-[10px]">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.attempted_at).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(r.external_post_url)}
                            title="Copy URL"><Copy className="h-3.5 w-3.5" /></Button>
                    <a href={r.external_post_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Mở">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(r)}
                            title="Chi tiết"><Info className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Hiển thị {(data.page * data.pageSize) + 1}-{Math.min((data.page + 1) * data.pageSize, data.total)} / {data.total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goPage(-1)} disabled={data.page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">Trang {data.page + 1}/{totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => goPage(1)} disabled={data.page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BacklinkDetailSheet row={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function Kpi({ icon, label, value, tone = "default" }: {
  icon: React.ReactNode; label: string; value: number; tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}<span>{label}</span>
        </div>
        <div className={`text-2xl font-semibold ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}>
          {value.toLocaleString("vi-VN")}
        </div>
      </CardContent>
    </Card>
  );
}
