import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export default function KeywordResearchLabTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [seed, setSeed] = useState("");
  const [limit, setLimit] = useState(30);
  const [running, setRunning] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["keyword-jobs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("keyword_research_jobs")
        .select("id,seed_keyword,mode,status,keywords_added,error_message,created_at,completed_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const handleRun = async () => {
    if (!seed.trim() || !orgId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-research", {
        body: { seed: seed.trim(), mode: "expand", organizationId: orgId, locale: "vi", limit },
      });
      if (error) throw error;
      toast.success(`Đã queue job (${data?.jobId?.slice(0, 8)}). AI đang sinh keyword...`);
      setSeed("");
      qc.invalidateQueries({ queryKey: ["keyword-jobs"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi gọi research");
    } finally {
      setRunning(false);
    }
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Research Lab</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-[1fr_120px_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Seed keyword</Label>
              <Input value={seed} onChange={e => setSeed(e.target.value)} placeholder="vd: AI tạo content cho spa" />
            </div>
            <div>
              <Label className="text-xs">Số lượng (tối đa 100)</Label>
              <Input type="number" min={5} max={100} value={limit} onChange={e => setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 30)))} />
            </div>
            <Button onClick={handleRun} disabled={running || !seed.trim()}>
              {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Run research
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Gemini 2.5 Pro sinh long-tail variants tiếng Việt + ước lượng volume/KD/intent + auto-cluster theo chủ đề. Job chạy nền 30-60s.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử jobs (auto-refresh 5s)</CardTitle></CardHeader>
        <CardContent>
          {(!jobs || jobs.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có job nào.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(j => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded border text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{j.seed_keyword}</span>
                      <Badge variant="outline" className="text-xs">{j.mode}</Badge>
                      <Badge
                        variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {j.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {j.status}
                      </Badge>
                    </div>
                    {j.error_message && <p className="text-xs text-destructive mt-1">{j.error_message}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: vi })}
                      {j.status === "done" && ` • Đã thêm ${j.keywords_added} keyword`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
