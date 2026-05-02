import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function KeywordClusterTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data: clusters, isLoading } = useQuery({
    queryKey: ["clusters-full", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from("keyword_clusters")
        .select("id,name,description,keyword_count,avg_priority,target_pillar_page_slug,color")
        .eq("organization_id", orgId!)
        .order("avg_priority", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!name.trim() || !orgId) return;
    const { error } = await supabase.from("keyword_clusters").insert({
      organization_id: orgId, name: name.trim(), description: desc.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã tạo cluster");
    setName(""); setDesc(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["clusters-full"] });
    qc.invalidateQueries({ queryKey: ["clusters-list"] });
  };

  const handleDelete = async (id: string, count: number) => {
    if (count > 0 && !confirm(`Cluster có ${count} keyword. Xóa cluster (keyword sẽ unassigned)?`)) return;
    const { error } = await supabase.from("keyword_clusters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa cluster");
    qc.invalidateQueries({ queryKey: ["clusters-full"] });
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Tổ chức từ khóa thành chủ đề (cluster) để xây pillar/cluster content strategy.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Cluster mới</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tạo cluster mới</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tên cluster *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="vd: AI Marketing cho Spa" /></div>
              <div><Label>Mô tả</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tùy chọn" /></div>
              <Button onClick={handleCreate} disabled={!name.trim()}>Tạo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(clusters || []).map(c => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" style={{ color: c.color || undefined }} />
                    <h3 className="font-semibold truncate">{c.name}</h3>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c.id, c.keyword_count)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary">{c.keyword_count} keyword</Badge>
                  <Badge variant="outline">Avg priority {Number(c.avg_priority).toFixed(0)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!clusters || clusters.length === 0) && (
            <p className="col-span-full text-center text-muted-foreground py-8">Chưa có cluster nào. Tạo mới hoặc chạy Research Lab — clusters sẽ được tạo tự động theo seed.</p>
          )}
        </div>
      )}
    </div>
  );
}
