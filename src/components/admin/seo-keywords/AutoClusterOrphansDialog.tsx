import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  keyword_id: string;
  keyword: string;
  cluster_id: string;
  cluster_name: string;
  confidence: number;
  reason: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Optional: hint AI to prefer this pillar */
  preferredClusterId?: string;
  onApplied?: () => void;
}

export default function AutoClusterOrphansDialog({ open, onOpenChange, preferredClusterId, onApplied }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [totalOrphans, setTotalOrphans] = useState(0);

  const run = async () => {
    if (!orgId) return;
    setLoading(true);
    setAssignments([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("seo-auto-cluster-orphans", {
        body: { orgId, clusterId: preferredClusterId },
      });
      if (error) throw error;
      const list: Assignment[] = data?.assignments || [];
      setAssignments(list);
      setTotalOrphans(data?.totalOrphans || 0);
      setSelected(new Set(list.map((a) => a.keyword_id)));
      if (list.length === 0) toast.info("AI không tìm thấy gợi ý phù hợp");
    } catch (e: any) {
      toast.error(e?.message || "Lỗi gọi AI");
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      // Group by cluster_id for batched updates
      const byCluster = new Map<string, string[]>();
      for (const a of assignments) {
        if (!selected.has(a.keyword_id)) continue;
        const arr = byCluster.get(a.cluster_id) || [];
        arr.push(a.keyword_id);
        byCluster.set(a.cluster_id, arr);
      }
      for (const [cid, ids] of byCluster.entries()) {
        const { error } = await supabase
          .from("seo_keywords")
          .update({ cluster_id: cid })
          .in("id", ids);
        if (error) throw error;
      }
      toast.success(`Đã gắn ${selected.size} keyword vào pillar`);
      qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
      qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
      qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
      onApplied?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Lỗi áp dụng");
    } finally {
      setApplying(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI gom orphan keyword vào Pillar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            AI sẽ phân tích các keyword chưa thuộc pillar nào (orphan) và đề xuất gắn vào pillar phù hợp nhất theo ngữ nghĩa.
          </p>

          {!loading && assignments.length === 0 && (
            <Button onClick={run} className="gap-1.5" size="sm">
              <Sparkles className="h-3.5 w-3.5" /> Phân tích bằng AI
            </Button>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> AI đang phân tích...
            </div>
          )}

          {assignments.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {assignments.length} đề xuất / {totalOrphans} orphan • Đã chọn {selected.size}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(new Set(assignments.map((a) => a.keyword_id)))}
                    className="text-primary hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:underline">
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                {assignments.map((a) => (
                  <label
                    key={a.keyword_id}
                    className="flex items-start gap-2 p-2.5 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(a.keyword_id)}
                      onCheckedChange={() => toggle(a.keyword_id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{a.keyword}</span>
                        <span className="text-[11px] text-muted-foreground">→</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {a.cluster_name}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 tabular-nums"
                          title="Confidence"
                        >
                          {Math.round(a.confidence * 100)}%
                        </Badge>
                      </div>
                      {a.reason && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{a.reason}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {assignments.length > 0 && (
            <Button variant="outline" onClick={run} disabled={loading} size="sm">
              Phân tích lại
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm">
            Đóng
          </Button>
          <Button onClick={apply} disabled={applying || selected.size === 0} size="sm" className="gap-1.5">
            {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Áp dụng {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
