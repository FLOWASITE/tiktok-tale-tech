import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Link2, Sparkles, FileText, AlertCircle, CheckCircle2, Copy, Target as TargetIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import KeywordTargetPicker from "@/components/seo/KeywordTargetPicker";
import InternalLinksPanel from "@/components/seo/InternalLinksPanel";

interface ContentRow {
  id: string;
  title: string | null;
  topic: string | null;
  status: string | null;
  target_keyword_ids: string[] | null;
  created_at: string;
}

interface KeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  priority_score: number | null;
  status: string;
  cluster_id: string | null;
}

export default function CoverageTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ContentRow | null>(null);
  const [editIds, setEditIds] = useState<string[]>([]);
  const [linksFor, setLinksFor] = useState<string | null>(null);

  const { data: pillars = [] } = useQuery({
    queryKey: ["coverage-pillars", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_clusters")
        .select("id,name,color")
        .eq("organization_id", orgId!)
        .order("name");
      return data || [];
    },
  });

  const { data: keywords = [], isLoading: kwLoading } = useQuery({
    queryKey: ["coverage-keywords", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<KeywordRow[]> => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,priority_score,status,cluster_id")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(1000);
      return (data as KeywordRow[]) || [];
    },
  });

  const { data: contents = [], isLoading: cLoading } = useQuery({
    queryKey: ["coverage-contents", orgId],
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

  // Index: keyword_id -> contents
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

  const orphanKeywords = useMemo(
    () => keywords.filter((k) => !coverage.has(k.id)).slice(0, 100),
    [keywords, coverage]
  );
  const coveredKeywords = useMemo(
    () => keywords.filter((k) => coverage.has(k.id)),
    [keywords, coverage]
  );

  // Cannibalization: keyword bị target bởi >= 2 content
  const cannibalized = useMemo(() => {
    return coveredKeywords
      .map((k) => ({ keyword: k, contents: coverage.get(k.id) || [] }))
      .filter((row) => row.contents.length >= 2)
      .sort((a, b) => b.contents.length - a.contents.length);
  }, [coveredKeywords, coverage]);

  // Gap-by-pillar: pillar nào còn nhiều orphan
  const pillarGap = useMemo(() => {
    const pillarMap = new Map(pillars.map((p) => [p.id, p]));
    const buckets = new Map<string, { pillar: any; total: number; covered: number; orphans: KeywordRow[] }>();
    keywords.forEach((k) => {
      if (!k.cluster_id) return;
      const p = pillarMap.get(k.cluster_id);
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

  const totalLinks = useMemo(
    () => contents.reduce((sum, c) => sum + (c.target_keyword_ids?.length || 0), 0),
    [contents]
  );
  const contentsWithKw = contents.filter((c) => (c.target_keyword_ids?.length || 0) > 0).length;

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

    // Fire-and-forget embed update
    supabase.functions
      .invoke("embed-content", { body: { content_id: editing.id } })
      .catch(() => {});

    setEditing(null);
    qc.invalidateQueries({ queryKey: ["coverage-contents"] });
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;
  const loading = kwLoading || cLoading;

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Tổng keyword</div>
            <div className="text-2xl font-bold mt-1">{keywords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" /> Đã có content
            </div>
            <div className="text-2xl font-bold mt-1">{coveredKeywords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" /> Orphan (chưa phủ)
            </div>
            <div className="text-2xl font-bold mt-1">{keywords.length - coveredKeywords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Content có keyword</div>
            <div className="text-2xl font-bold mt-1">
              {contentsWithKw}
              <span className="text-sm font-normal text-muted-foreground"> / {contents.length}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {totalLinks} liên kết
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="orphan">
          <TabsList>
            <TabsTrigger value="orphan" className="gap-1.5">
              <AlertCircle className="h-4 w-4" /> Orphan ({orphanKeywords.length})
            </TabsTrigger>
            <TabsTrigger value="gap" className="gap-1.5">
              <TargetIcon className="h-4 w-4" /> Gap by Pillar ({pillarGap.length})
            </TabsTrigger>
            <TabsTrigger value="cannibal" className="gap-1.5">
              <Copy className="h-4 w-4" /> Cannibalization ({cannibalized.length})
            </TabsTrigger>
            <TabsTrigger value="covered" className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Đã phủ ({coveredKeywords.length})
            </TabsTrigger>
            <TabsTrigger value="contents" className="gap-1.5">
              <FileText className="h-4 w-4" /> Contents ({contents.length})
            </TabsTrigger>
          </TabsList>

          {/* Orphan keywords */}
          <TabsContent value="orphan" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orphanKeywords.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.keyword}</TableCell>
                        <TableCell className="text-right">
                          {k.search_volume?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">{k.priority_score ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{k.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orphanKeywords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          🎉 Tất cả keyword đã có ít nhất 1 content phủ.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Hiển thị tối đa 100 orphan keyword (sắp xếp theo priority).
            </p>
          </TabsContent>

          {/* Gap by Pillar */}
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
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Chưa có keyword nào được gắn vào pillar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Sắp xếp theo % coverage thấp nhất — pillar cần ưu tiên viết content.
            </p>
          </TabsContent>

          {/* Cannibalization */}
          <TabsContent value="cannibal" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right"># Content</TableHead>
                      <TableHead>Đang cạnh tranh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cannibalized.map(({ keyword, contents: list }) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="font-medium">{keyword.keyword}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{list.length}</Badge>
                        </TableCell>
                        <TableCell className="text-xs space-y-0.5">
                          {list.map((c) => (
                            <div key={c.id} className="truncate max-w-md text-muted-foreground">
                              · {c.title || c.topic || c.id.slice(0, 8)}{" "}
                              <Badge variant="outline" className="text-[9px] ml-1">{c.status || "—"}</Badge>
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {cannibalized.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          🎉 Không có keyword bị cannibalize.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">
              Keyword bị target bởi ≥2 content — cân nhắc gộp content hoặc đổi target keyword phụ.
            </p>
          </TabsContent>

          {/* Covered keywords */}
          <TabsContent value="covered" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Content liên kết</TableHead>
                      <TableHead>Tiêu đề content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coveredKeywords.map((k) => {
                      const list = coverage.get(k.id) || [];
                      return (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.keyword}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{list.length}</Badge>
                          </TableCell>
                          <TableCell className="text-xs space-y-0.5">
                            {list.slice(0, 3).map((c) => (
                              <div key={c.id} className="truncate max-w-md text-muted-foreground">
                                · {c.title || c.topic || c.id.slice(0, 8)}
                              </div>
                            ))}
                            {list.length > 3 && (
                              <div className="text-[10px] text-muted-foreground">
                                +{list.length - 3} khác
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {coveredKeywords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Chưa có keyword nào được link vào content.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content list with edit/links */}
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
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{c.status || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-7 gap-1">
                              <Link2 className="h-3.5 w-3.5" /> Keywords
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setLinksFor(c.id)}
                              className="h-7 gap-1"
                            >
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
            <p className="text-xs text-muted-foreground mt-2">Hiển thị 200 content gần nhất.</p>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit keywords dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liên kết keyword cho content</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground line-clamp-2">
              {editing?.title || editing?.topic}
            </div>
            <KeywordTargetPicker selectedIds={editIds} onChange={setEditIds} max={5} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={saveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal links dialog */}
      <Dialog open={!!linksFor} onOpenChange={(o) => !o && setLinksFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gợi ý liên kết nội bộ</DialogTitle>
          </DialogHeader>
          {linksFor && <InternalLinksPanel contentId={linksFor} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
