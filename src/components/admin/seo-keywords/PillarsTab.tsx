import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import PillarDetailView from "./PillarDetailView";

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  pillar_keyword_id: string | null;
  pillar_content_id: string | null;
}

interface Coverage {
  cluster_id: string;
  keyword_count: number;
  keywords_covered: number;
  topic_count: number;
  topics_used: number;
  coverage_pct: number;
}

export default function PillarsTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["seo-clusters", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_clusters")
        .select("id,name,description,status,color,pillar_keyword_id,pillar_content_id")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Cluster[];
    },
  });

  const { data: coverage = [] } = useQuery({
    queryKey: ["seo-cluster-coverage", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cluster_coverage")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return ((data || []) as unknown) as Coverage[];
    },
  });

  const covMap = new Map(coverage.map((c) => [c.cluster_id, c]));

  const handleCreate = async () => {
    if (!name.trim() || !orgId) return;
    const { error } = await supabase.from("seo_clusters").insert({
      organization_id: orgId,
      name: name.trim(),
      description: desc.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã tạo Pillar cluster");
    setName("");
    setDesc("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["seo-clusters"] });
  };

  const handleDelete = async (id: string, kwCount: number) => {
    if (kwCount > 0 && !confirm(`Pillar có ${kwCount} keyword. Xóa? (Keyword & topic sẽ unassign)`)) return;
    const { error } = await supabase.from("seo_clusters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    qc.invalidateQueries({ queryKey: ["seo-clusters"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  if (activeId) {
    return (
      <PillarDetailView
        clusterId={activeId}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Topic Pillars</h2>
          <p className="text-sm text-muted-foreground">
            Nhóm pillar + cluster keywords + content. Mỗi pillar = một silo SEO.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Tạo Pillar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Pillar mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tên pillar</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vd: Nâng mũi cấu trúc"
                />
              </div>
              <div>
                <Label>Mô tả (tùy chọn)</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Tạo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      ) : clusters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Chưa có Pillar nào. Tạo pillar đầu tiên để gom keyword + content thành silo SEO.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((c) => {
            const cov = covMap.get(c.id);
            return (
              <Card key={c.id} className="hover:border-foreground/30 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || "#6B7280" }}
                        />
                        <h3 className="font-semibold truncate">{c.name}</h3>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Keywords</div>
                      <div className="font-medium">
                        {cov?.keywords_covered || 0}/{cov?.keyword_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Topics</div>
                      <div className="font-medium">
                        {cov?.topics_used || 0}/{cov?.topic_count || 0}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Coverage</span>
                      <span>{cov?.coverage_pct || 0}%</span>
                    </div>
                    <Progress value={cov?.coverage_pct || 0} className="h-1.5" />
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => setActiveId(c.id)}
                    >
                      Mở <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.id, cov?.keyword_count || 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
