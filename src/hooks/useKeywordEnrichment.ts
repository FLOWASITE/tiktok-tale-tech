import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface EnrichmentJob {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  total: number;
  done: number;
  errors: { id: string; error: string }[];
}

export function useKeywordEnrichment() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [job, setJob] = useState<EnrichmentJob | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollJob = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      const { data } = await supabase
        .from("keyword_enrichment_jobs")
        .select("id,status,total,done,errors")
        .eq("id", jobId)
        .maybeSingle();
      if (!data) return;
      setJob(data as EnrichmentJob);
      if (data.status === "done" || data.status === "failed") {
        stopPolling();
        if (data.status === "done") {
          toast.success(`Enrich xong ${data.done}/${data.total} keyword${data.errors?.length ? ` (${data.errors.length} lỗi)` : ""}`);
        } else {
          toast.error(`Enrich thất bại (${data.errors?.length || 0} lỗi)`);
        }
        qc.invalidateQueries({ queryKey: ["seo-keywords"] });
        qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
        setTimeout(() => setJob(null), 5000);
      }
    }, 3000);
  }, [qc, stopPolling]);

  const enrich = useCallback(async (keywordIds: string[]) => {
    if (!orgId || keywordIds.length === 0) return;
    if (keywordIds.length > 50) {
      toast.error("Tối đa 50 keyword/lần");
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-keyword-serp", {
        body: { keywordIds, organizationId: orgId },
      });
      if (error) throw error;
      if (!data?.hasFirecrawl) {
        toast.warning("Firecrawl chưa cấu hình — chỉ chạy AI intent classify, KD/SERP sẽ giữ default");
      } else {
        toast.success(`Đang enrich ${keywordIds.length} keyword...`);
      }
      setJob({ id: data.jobId, status: "queued", total: keywordIds.length, done: 0, errors: [] });
      pollJob(data.jobId);
    } catch (e: any) {
      toast.error(e?.message || "Lỗi gọi enrich");
    } finally {
      setStarting(false);
    }
  }, [orgId, pollJob]);

  return { enrich, job, starting };
}
