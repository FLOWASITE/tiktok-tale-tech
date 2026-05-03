import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSeoKeywords, useSeoKeywordsCache, type SeoKeywordRow } from "@/hooks/useSeoKeywords";
import { useSeoPillars } from "@/hooks/useSeoPillars";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, FolderTree, Link2, TrendingUp, AlertCircle, CheckCircle2,
  Copy, Target as TargetIcon, FileText, Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import KeywordTargetPicker from "@/components/seo/KeywordTargetPicker";
import InternalLinksPanel from "@/components/seo/InternalLinksPanel";
import { LazyAssignSelect } from "./LazyAssignSelect";

type KeywordRow = SeoKeywordRow;
interface ContentRow {
  id: string;
  title: string | null;
  topic: string | null;
  status: string | null;
  target_keyword_ids: string[] | null;
  created_at: string;
}

export default function OverviewTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const VALID_SUB = new Set(["orphan", "gap", "cannibal", "contents"]);
  const sub = VALID_SUB.has(params.get("sub") || "") ? (params.get("sub") as string) : "orphan";
  const setSub = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("sub", v);
    setParams(next, { replace: true });
  };
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [editIds, setEditIds] = useState<string[]>([]);
  const [linksFor, setLinksFor] = useState<string | null>(null);
  const PAGE_SIZE = 25;
  const [orphanPage, setOrphanPage] = useState(1);
  const [cannibalPage, setCannibalPage] = useState(1);

  const { data: pillars = [] } = useSeoPillars();
  const { data: keywords = [], isLoading: kwLoading } = useSeoKeywords();
  const kwCache = useSeoKeywordsCache();

  const { data: contents = [], isLoading: cLoading } = useQuery({
    queryKey: ["overview-contents", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<ContentRow[]> => {
      const { data } = await supabase
        .from("multi_channel_contents")
        .select("id,title,topic,status,target_keyword_ids,created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return (data as ContentRow[]) || [];
    },
  });

  const { data: landingPages = [] } = useQuery({
    queryKey: ["overview-landing-pages", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_landing_pages")
        .select("id,slug,title")
        .order("updated_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  const quickAssign = async (
    keywordId: string,
    patch: { cluster_id?: string | null; assigned_landing_page_id?: string | null }
  ) => {
    // Optimistic patch — instant UI, no refetch of 1000 rows
    kwCache.patch(keywordId, patch);
    const { error } = await supabase.from("seo_keywords").update(patch).eq("id", keywordId);
    if (error) {
      toast.error(error.message);
      kwCache.invalidate(); // rollback by refetch
      return;
    }
    toast.success("Đã gán");
  };

  const keepWinner = async (keywordId: string, winnerContentId: string, allContents: ContentRow[]) => {
    const losers = allContents.filter((c) => c.id !== winnerContentId);
    // Optimistic update on contents cache
    qc.setQueryData<ContentRow[]>(["overview-contents", orgId], (prev) =>
      (prev || []).map((c) =>
        losers.find((l) => l.id === c.id)
          ? { ...c, target_keyword_ids: (c.target_keyword_ids || []).filter((id) => id !== keywordId) }
          : c
      )
    );
    const updates = losers.map((c) =>
      supabase
        .from("multi_channel_contents")
        .update({
          target_keyword_ids: (c.target_keyword_ids || []).filter((id) => id !== keywordId),
        })
        .eq("id", c.id)
    );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ["overview-contents"] });
      return;
    }
    toast.success(`Giữ winner, gỡ keyword khỏi ${losers.length} content khác`);
  };


  // Index keyword_id -> contents
  const coverage = useMemo(() => {
    const map = new Map<string, ContentRow[]>();
    contents.forEach((c) => {
      (c.target_keyword_ids || []).forEach((kid) => {
        if (!map.has(kid)) map.set(kid, []);
        map.get(kid)!.push(c);
      });
    });
    return map;
  }, [contents]);

  // KPIs
  const kpiData = useMemo(() => {
    const total = keywords.length;
    const assigned = keywords.filter((k) => k.assigned_landing_page_id).length;
    const avgPriority = total > 0
      ? Math.round(keywords.reduce((s, k) => s + (k.priority_score || 0), 0) / total)
      : 0;
    const funnel = {
      TOFU: keywords.filter((k) => k.funnel_stage === "TOFU").length,
      MOFU: keywords.filter((k) => k.funnel_stage === "MOFU").length,
      BOFU: keywords.filter((k) => k.funnel_stage === "BOFU").length,
    };
    return { total, assigned, avgPriority, funnel };
  }, [keywords]);

  const orphanAll = useMemo(
    () => keywords.filter((k) => !coverage.has(k.id)),
    [keywords, coverage]
  );
  const orphanTotalPages = Math.max(1, Math.ceil(orphanAll.length / PAGE_SIZE));
  const orphanCurPage = Math.min(orphanPage, orphanTotalPages);
  const orphanKeywords = useMemo(
    () => orphanAll.slice((orphanCurPage - 1) * PAGE_SIZE, orphanCurPage * PAGE_SIZE),
    [orphanAll, orphanCurPage]
  );
  const coveredCount = keywords.length - keywords.filter((k) => !coverage.has(k.id)).length;

  const cannibalized = useMemo(() => {
    return keywords
      .filter((k) => coverage.has(k.id))
      .map((k) => ({ keyword: k, contents: coverage.get(k.id) || [] }))
      .filter((row) => row.contents.length >= 2)
      .sort((a, b) => b.contents.length - a.contents.length);
  }, [keywords, coverage]);

  const pillarGap = useMemo(() => {
    const pmap = new Map(pillars.map((p) => [p.id, p]));
    const buckets = new Map<string, { pillar: any; total: number; covered: number; orphans: KeywordRow[] }>();
    keywords.forEach((k) => {
      if (!k.cluster_id) return;
      const p = pmap.get(k.cluster_id);
      if (!p) return;
      if (!buckets.has(k.cluster_id)) {
        buckets.set(k.cluster_id, { pillar: p, total: 0, covered: 0, orphans: [] });
      }
      const b = buckets.get(k.cluster_id)!;
      b.total += 1;
      if (coverage.has(k.id)) b.covered += 1;
      else b.orphans.push(k);
    });
    return Array.from(buckets.values())
      .map((b) => ({ ...b, ratio: b.total ? b.covered / b.total : 0 }))
      .sort((a, b) => a.ratio - b.ratio);
  }, [keywords, pillars, coverage]);

  const topUnassigned = useMemo(
    () => keywords.filter((k) => !k.assigned_landing_page_id).slice(0, 10),
    [keywords]
  );

  const openEdit = (c: ContentRow) => {
    setEditing(c);
    setEditIds(c.target_keyword_ids || []);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("multi_channel_contents")
      .update({ target_keyword_ids: editIds.length ? editIds : null })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Đã lưu keyword targeting");
    supabase.functions.invoke("embed-content", { body: { content_id: editing.id } }).catch(() => {});
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["overview-contents"] });
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;
  const loading = kwLoading || cLoading;

  if (loading) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  }

  const kpis = [
    { label: "Tổng keyword", value: kpiData.total, icon: Search },
    { label: "Pillars", value: pillars.length, icon: FolderTree },
    { label: "Đã có content", value: `${coveredCount}/${kpiData.total}`, icon: Link2 },
    { label: "Avg priority", value: kpiData.avgPriority, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                </div>
                <k.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel + Top unassigned */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Funnel distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(["TOFU", "MOFU", "BOFU"] as const).map((stage) => {
              const count = kpiData.funnel[stage];
              const pct = kpiData.total > 0 ? (count / kpiData.total) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{stage}</span>
                    <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 high-priority chưa gán page</CardTitle></CardHeader>
          <CardContent>
            {topUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tất cả keyword đã được gán page.</p>
            ) : (
              <ul className="space-y-2">
                {topUnassigned.map((k) => (
                  <li key={k.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{k.keyword}</span>
                    <Badge variant="secondary" className="ml-2">{k.priority_score}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action items */}
      <Tabs value={sub} onValueChange={setSub}>
        <TabsList>
          <TabsTrigger value="orphan" className="gap-1.5">
            <AlertCircle className="h-4 w-4" /> Orphan ({orphanAll.length})
          </TabsTrigger>
          <TabsTrigger value="gap" className="gap-1.5">
            <TargetIcon className="h-4 w-4" /> Gap by Pillar ({pillarGap.length})
          </TabsTrigger>
          <TabsTrigger value="cannibal" className="gap-1.5">
            <Copy className="h-4 w-4" /> Cannibalization ({cannibalized.length})
          </TabsTrigger>
          <TabsTrigger value="contents" className="gap-1.5">
            <FileText className="h-4 w-4" /> Contents ({contents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orphan" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                    <TableHead className="w-[180px]">Pillar</TableHead>
                    <TableHead className="w-[200px]">Landing page</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orphanKeywords.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.keyword}</TableCell>
                      <TableCell className="text-right">{k.search_volume?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{k.priority_score ?? 0}</TableCell>
                      <TableCell>
                        <Select
                          value={k.cluster_id || "__none__"}
                          onValueChange={(v) => quickAssign(k.id, { cluster_id: v === "__none__" ? null : v })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn pillar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Không gắn —</SelectItem>
                            {pillars.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || "#6B7280" }} />
                                  {p.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={k.assigned_landing_page_id || "__none__"}
                          onValueChange={(v) =>
                            quickAssign(k.id, { assigned_landing_page_id: v === "__none__" ? null : v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn page" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Chưa gán —</SelectItem>
                            {landingPages.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.title || p.slug}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orphanKeywords.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      🎉 Tất cả keyword đã có content phủ.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              Trang {orphanCurPage}/{orphanTotalPages} • {orphanAll.length} orphan tổng cộng
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={orphanCurPage <= 1}
                onClick={() => setOrphanPage((p) => Math.max(1, p - 1))}>
                ← Trước
              </Button>
              <Button size="sm" variant="ghost" disabled={orphanCurPage >= orphanTotalPages}
                onClick={() => setOrphanPage((p) => Math.min(orphanTotalPages, p + 1))}>
                Sau →
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gap" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pillar</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                    <TableHead className="text-right">Orphan</TableHead>
                    <TableHead>Top orphan keywords</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pillarGap.map(({ pillar, total, covered, orphans, ratio }) => (
                    <TableRow key={pillar.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pillar.color || "#6B7280" }} />
                          {pillar.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={ratio < 0.3 ? "destructive" : ratio < 0.7 ? "outline" : "secondary"}>
                          {covered}/{total} ({Math.round(ratio * 100)}%)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{orphans.length}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {orphans.slice(0, 3).map((k) => k.keyword).join(", ")}
                        {orphans.length > 3 && ` +${orphans.length - 3}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7"
                          onClick={() => navigate(`/admin/seo?tab=pillars&pillar=${pillar.id}`)}>
                          Mở pillar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pillarGap.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Chưa có keyword nào được gắn vào pillar.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cannibal" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right"># Content</TableHead>
                    <TableHead>Chọn winner (giữ keyword, gỡ khỏi các content khác)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cannibalized
                    .slice((Math.min(cannibalPage, Math.max(1, Math.ceil(cannibalized.length / PAGE_SIZE))) - 1) * PAGE_SIZE,
                           Math.min(cannibalPage, Math.max(1, Math.ceil(cannibalized.length / PAGE_SIZE))) * PAGE_SIZE)
                    .map(({ keyword, contents: list }) => (
                    <TableRow key={keyword.id}>
                      <TableCell className="font-medium align-top pt-3">{keyword.keyword}</TableCell>
                      <TableCell className="text-right align-top pt-3">
                        <Badge variant="destructive">{list.length}</Badge>
                      </TableCell>
                      <TableCell className="text-xs space-y-1">
                        {list.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="truncate max-w-md text-muted-foreground flex-1">
                              · {c.title || c.topic || c.id.slice(0, 8)}{" "}
                              <Badge variant="outline" className="text-[9px] ml-1">{c.status || "—"}</Badge>
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px] shrink-0"
                              onClick={() => keepWinner(keyword.id, c.id, list)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Giữ làm winner
                            </Button>
                          </div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cannibalized.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      🎉 Không có keyword bị cannibalize.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {cannibalized.length > 0 && (() => {
            const totalPages = Math.max(1, Math.ceil(cannibalized.length / PAGE_SIZE));
            const cur = Math.min(cannibalPage, totalPages);
            return (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Trang {cur}/{totalPages} • {cannibalized.length} keyword
                </p>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={cur <= 1}
                    onClick={() => setCannibalPage((p) => Math.max(1, p - 1))}>
                    ← Trước
                  </Button>
                  <Button size="sm" variant="ghost" disabled={cur >= totalPages}
                    onClick={() => setCannibalPage((p) => Math.min(totalPages, p + 1))}>
                    Sau →
                  </Button>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="contents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Keywords</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contents.slice(0, 200).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-md truncate">
                        {c.title || c.topic || c.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={c.target_keyword_ids?.length ? "secondary" : "outline"}>
                          {c.target_keyword_ids?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.status || "—"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-7 gap-1">
                            <Link2 className="h-3.5 w-3.5" /> Keywords
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setLinksFor(c.id)} className="h-7 gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> Internal links
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2">200 content gần nhất.</p>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Liên kết keyword cho content</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground line-clamp-2">{editing?.title || editing?.topic}</div>
            <KeywordTargetPicker selectedIds={editIds} onChange={setEditIds} max={5} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={saveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linksFor} onOpenChange={(o) => !o && setLinksFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gợi ý liên kết nội bộ</DialogTitle></DialogHeader>
          {linksFor && <InternalLinksPanel contentId={linksFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
