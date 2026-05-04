import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Tạo chỉ mục ngữ nghĩa (vector embedding) cho mọi bài trong workspace.
 * Cần thiết để tab "Liên kết nội bộ" gợi ý đúng — vì cần cả source và candidates đều có embedding.
 */
export default function EmbeddingBackfillCard() {
  const { currentOrganization } = useOrganization();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [stop, setStop] = useState(false);

  const refresh = async () => {
    if (!currentOrganization?.id) return;
    // Chỉ tính các bài đã publish ra ít nhất 1 kênh long-form (có URL công khai)
    const PUBLISHED_FILTER =
      "website_post_url.not.is.null,blogger_post_url.not.is.null,wordpress_post_url.not.is.null,flowa_blog_post_url.not.is.null";
    const [{ count: tot }, { count: rem }] = await Promise.all([
      (supabase as any).from("multi_channel_contents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization.id)
        .or(PUBLISHED_FILTER),
      (supabase as any).from("multi_channel_contents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", currentOrganization.id)
        .is("content_embedding", null)
        .or(PUBLISHED_FILTER),
    ]);
    setTotal(tot ?? 0);
    setRemaining(rem ?? 0);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [currentOrganization?.id]);

  const run = async () => {
    if (!currentOrganization?.id) return;
    setRunning(true);
    setStop(false);
    let totalProcessed = 0;
    try {
      // Loop until done or user stops
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (stop) break;
        const { data, error } = await supabase.functions.invoke("backfill-content-embeddings", {
          body: { organization_id: currentOrganization.id, batch_size: 20 },
        });
        if (error) throw error;
        const processed = (data as any)?.processed ?? 0;
        const left = (data as any)?.remaining ?? 0;
        totalProcessed += processed;
        setRemaining(left);
        if (processed === 0 || left === 0) break;
      }
      toast.success(`Đã tạo chỉ mục cho ${totalProcessed} bài`);
    } catch (e: any) {
      toast.error(e?.message || "Backfill thất bại");
    } finally {
      setRunning(false);
      refresh();
    }
  };

  if (!total) return null;
  const done = (total ?? 0) - (remaining ?? 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-muted p-2">
          <Database className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Chỉ mục ngữ nghĩa nội dung</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cần thiết để gợi ý liên kết nội bộ tự động. Mỗi bài được encode thành vector 384 chiều để so độ tương đồng.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{done}/{total} bài đã có chỉ mục</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={run} disabled={running || (remaining ?? 0) === 0} className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {running ? `Đang xử lý... còn ${remaining ?? 0}` : (remaining ?? 0) === 0 ? "Đã hoàn tất" : `Tạo chỉ mục cho ${remaining} bài`}
        </Button>
        {running && (
          <Button size="sm" variant="ghost" onClick={() => setStop(true)}>Dừng</Button>
        )}
      </div>
    </div>
  );
}
