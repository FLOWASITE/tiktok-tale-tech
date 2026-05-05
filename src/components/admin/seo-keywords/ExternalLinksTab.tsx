import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, RefreshCw, Copy, ExternalLink as ExtIcon, Search, Download, ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  useExternalLinks, useExternalLinkStats, useSyncExternalLinks, useLongformConnections,
} from "@/hooks/useExternalLinks";

const SOURCE_LABEL: Record<string, string> = {
  wordpress: "WordPress",
  wordpress_com: "WordPress.com",
  blogger: "Blogger",
  sitemap: "Sitemap",
  manual: "Thủ công",
};

export default function ExternalLinksTab() {
  const [filter, setFilter] = useState({ search: "", domain: "all", sourceType: "all", page: 0, pageSize: 50 });
  const [sitemapInput, setSitemapInput] = useState("");
  const [sitemapOpen, setSitemapOpen] = useState(false);

  const { data, isLoading } = useExternalLinks(filter);
  const { data: stats } = useExternalLinkStats();
  const { data: connections } = useLongformConnections();
  const sync = useSyncExternalLinks();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const goPage = (delta: number) =>
    setFilter((f) => ({ ...f, page: Math.max(0, Math.min(totalPages - 1, f.page + delta)) }));

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Đã copy URL"); };

  const exportCsv = () => {
    if (!data?.rows.length) return;
    const headers = ["Title", "URL", "Domain", "Source", "PublishedAt"];
    const rows = data.rows.map((r) => [
      (r.title || "").replace(/"/g, '""'),
      r.url, r.domain, r.source_type, r.published_at || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `external-links-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tổng URL" value={stats?.total ?? 0} />
        <Kpi label="Domains" value={stats?.domains.length ?? 0} />
        <Kpi label="Long-form (WP+Blogger)"
             value={(stats?.bySource.wordpress || 0) + (stats?.bySource.wordpress_com || 0) + (stats?.bySource.blogger || 0)} />
        <Kpi label="Lần sync gần nhất" value={0}
             customValue={stats?.lastSync ? new Date(stats.lastSync).toLocaleDateString("vi-VN") : "—"} />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Tìm theo tiêu đề hoặc URL…"
                  value={filter.search}
                  onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value, page: 0 }))}
                />
              </div>
              <Select value={filter.sourceType}
                      onValueChange={(v) => setFilter((f) => ({ ...f, sourceType: v, page: 0 }))}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nguồn</SelectItem>
                  {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filter.domain}
                      onValueChange={(v) => setFilter((f) => ({ ...f, domain: v, page: 0 }))}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả domain</SelectItem>
                  {(stats?.domains || []).map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.rows.length}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={sync.isPending}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />
                    Sync nguồn link
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px]">
                  <DropdownMenuLabel>Kết nối có sẵn</DropdownMenuLabel>
                  {(connections || []).length === 0 && (
                    <DropdownMenuItem disabled>Chưa có kết nối WP/Blogger nào</DropdownMenuItem>
                  )}
                  {(connections || []).map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => sync.mutate({ connectionId: c.id })}
                    >
                      <Globe className="h-3.5 w-3.5 mr-2" />
                      <span className="flex-1 truncate">
                        {c.platform_display_name || c.metadata?.site_url || c.metadata?.selected_site_url || c.metadata?.blog_url || c.platform}
                      </span>
                      <Badge variant="outline" className="ml-1 text-[10px]">{SOURCE_LABEL[c.platform === "website" ? "sitemap" : c.platform]}</Badge>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <Dialog open={sitemapOpen} onOpenChange={setSitemapOpen}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSitemapOpen(true); }}>
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        Sync từ sitemap.xml…
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Sync URL từ sitemap</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Dán URL sitemap đầy đủ (vd: <code>https://example.com/sitemap.xml</code>).
                          Hỗ trợ cả sitemap-index.
                        </p>
                        <Input
                          placeholder="https://example.com/sitemap.xml"
                          value={sitemapInput}
                          onChange={(e) => setSitemapInput(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setSitemapOpen(false)}>Huỷ</Button>
                        <Button
                          disabled={!sitemapInput.startsWith("http") || sync.isPending}
                          onClick={() => {
                            sync.mutate(
                              { sitemapUrl: sitemapInput.trim() },
                              { onSuccess: () => { setSitemapOpen(false); setSitemapInput(""); } }
                            );
                          }}
                        >
                          {sync.isPending ? "Đang sync…" : "Sync ngay"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !data?.rows.length ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Chưa có URL nào. Bấm <strong>Sync nguồn link</strong> ở trên để kéo dữ liệu từ
              WordPress / Blogger / sitemap.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="w-[200px]">Domain</TableHead>
                  <TableHead className="w-[120px]">Nguồn</TableHead>
                  <TableHead className="w-[120px]">Đăng</TableHead>
                  <TableHead className="w-[120px] text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-sm line-clamp-1">{r.title || "(không có tiêu đề)"}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.url}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.domain}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{SOURCE_LABEL[r.source_type] || r.source_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.published_at ? new Date(r.published_at).toLocaleDateString("vi-VN") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copy(r.url)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <ExtIcon className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data && data.total > data.pageSize && (
            <div className="p-3 flex items-center justify-between border-t">
              <p className="text-xs text-muted-foreground">
                Trang {filter.page + 1}/{totalPages} · {data.total.toLocaleString("vi-VN")} URL
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={filter.page === 0} onClick={() => goPage(-1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" disabled={filter.page >= totalPages - 1} onClick={() => goPage(1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, customValue }: { label: string; value: number; customValue?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-2xl font-semibold">{customValue ?? value.toLocaleString("vi-VN")}</div>
      </CardContent>
    </Card>
  );
}
