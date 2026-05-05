import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GitMerge } from "lucide-react";
import { toast } from "sonner";

interface PillarLite {
  id: string;
  name: string;
}

interface Coverage {
  cluster_id: string;
  keyword_count: number;
  topic_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  pillars: PillarLite[];
  coverage: Coverage[];
  onDone: () => void;
}

export default function PillarBulkMergeDialog({
  open,
  onOpenChange,
  selectedIds,
  pillars,
  coverage,
  onDone,
}: Props) {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const selectedPillars = useMemo(
    () => pillars.filter((p) => selectedIds.includes(p.id)),
    [pillars, selectedIds]
  );

  const covMap = useMemo(() => new Map(coverage.map((c) => [c.cluster_id, c])), [coverage]);

  const totals = useMemo(() => {
    let kw = 0;
    let topics = 0;
    for (const id of selectedIds) {
      const c = covMap.get(id);
      kw += c?.keyword_count || 0;
      topics += c?.topic_count || 0;
    }
    return { kw, topics };
  }, [selectedIds, covMap]);

  const sourceIds = selectedIds.filter((id) => id !== targetId);

  const handleMerge = async () => {
    if (!targetId || sourceIds.length === 0) return;
    setBusy(true);
    try {
      // 1. Reassign keywords
      const { error: e1 } = await supabase
        .from("seo_keywords")
        .update({ cluster_id: targetId })
        .in("cluster_id", sourceIds);
      if (e1) throw e1;

      // 2. Reassign multichannel contents
      const { error: e2 } = await supabase
        .from("multi_channel_contents")
        .update({ cluster_id: targetId })
        .in("cluster_id", sourceIds);
      if (e2) throw e2;

      // 3. Reassign topic_history
      const { error: e3 } = await (supabase as any)
        .from("topic_history")
        .update({ cluster_id: targetId })
        .in("cluster_id", sourceIds);
      if (e3) throw e3;

      // 4. Delete source pillars
      const { error: e4 } = await supabase
        .from("seo_clusters")
        .delete()
        .in("id", sourceIds);
      if (e4) throw e4;

      toast.success(`Đã merge ${sourceIds.length} pillar vào "${pillars.find((p) => p.id === targetId)?.name}"`);
      qc.invalidateQueries({ queryKey: ["seo-clusters"] });
      qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
      qc.invalidateQueries({ queryKey: ["seo-pillars-shared"] });
      qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
      onDone();
      onOpenChange(false);
      setTargetId("");
    } catch (err: any) {
      toast.error(err.message || "Merge thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" /> Merge {selectedIds.length} pillar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-medium text-sm mb-1">Sẽ chuyển sang pillar đích:</div>
            <div className="text-muted-foreground">
              <strong className="text-foreground">{totals.kw}</strong> keywords ·{" "}
              <strong className="text-foreground">{totals.topics}</strong> contents · topic history
            </div>
            <div className="text-muted-foreground">
              Pillars nguồn (sẽ bị xóa): {selectedPillars.filter((p) => p.id !== targetId).map((p) => p.name).join(", ") || "—"}
            </div>
          </div>

          <div>
            <Label>Pillar đích (giữ lại)</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn pillar sẽ được giữ lại..." />
              </SelectTrigger>
              <SelectContent>
                {selectedPillars.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert variant="destructive">
            <AlertDescription className="text-xs">
              Hành động không thể hoàn tác. {sourceIds.length} pillar nguồn sẽ bị xóa, toàn bộ keyword/content/topic
              của chúng được chuyển sang pillar đích.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={handleMerge} disabled={!targetId || sourceIds.length === 0 || busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Merge {sourceIds.length} → 1
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
