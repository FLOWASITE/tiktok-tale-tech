import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RETENTION_DAYS = 7;
// TẠM KHÓA cleanup media (bài/ảnh/video không bị xóa sau 7 ngày).
// Đổi sang `true` để bật lại retention.
const CLEANUP_ENABLED = false;

// Buckets quét để xóa file media cũ. KHÔNG đụng tới brand-logos hoặc các bucket asset thương hiệu.
const MEDIA_BUCKETS = ["carousel-images"] as const;

interface CleanupSummary {
  channel_images_deleted: number;
  carousel_images_deleted: number;
  videos_deleted: number;
  storage_files_removed: number;
  storage_files_skipped_protected: number;
  storage_files_skipped_missing: number;
  orphan_storage_files_found: number;
  orphan_storage_files_removed: number;
  orphan_storage_files_skipped_protected: number;
  errors: string[];
}

function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/**
 * Đệ quy list tất cả file trong bucket (storage.list mặc định chỉ trả 1 cấp).
 * Trả mảng { path, created_at } cho từng file.
 */
async function listAllFiles(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  prefix = "",
  out: Array<{ path: string; created_at: string | null }> = [],
): Promise<Array<{ path: string; created_at: string | null }>> {
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      // Folder: id === null
      if (entry.id === null) {
        const sub = prefix ? `${prefix}/${entry.name}` : entry.name;
        await listAllFiles(supabase, bucket, sub, out);
      } else {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        out.push({ path: fullPath, created_at: entry.created_at ?? null });
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

Deno.serve(withPerf({ functionName: "cleanup-old-media", slowThresholdMs: 60000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date();
  const startMs = Date.now();
  let triggeredBy: "cron" | "manual" = "cron";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    if (req.method === "POST") {
      const body = await req.clone().json().catch(() => null);
      if (body?.triggered_by === "manual") triggeredBy = "manual";
    }
  } catch { /* ignore */ }

  const writeLog = async (
    status: "success" | "partial" | "failed",
    summary: CleanupSummary | null,
    fatalError?: string,
  ) => {
    try {
      const errors = [...(summary?.errors ?? [])];
      if (fatalError) errors.push(fatalError);
      const { error } = await supabase.from("cron_run_logs").insert({
        job_name: "cleanup-old-media",
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startMs,
        status,
        triggered_by: triggeredBy,
        summary: summary ?? {},
        errors,
      });
      if (error) console.error("[cleanup-old-media] cron_run_logs insert failed:", error.message);
    } catch (logErr) {
      console.error("[cleanup-old-media] writeLog threw:", logErr);
    }
  };

  try {
    // Short-circuit: retention tạm khóa, không xóa bất cứ thứ gì.
    if (!CLEANUP_ENABLED) {
      console.log("[cleanup-old-media] DISABLED — skipping all deletion (CLEANUP_ENABLED=false)");
      await writeLog("success", {
        channel_images_deleted: 0,
        carousel_images_deleted: 0,
        videos_deleted: 0,
        storage_files_removed: 0,
        storage_files_skipped_protected: 0,
        storage_files_skipped_missing: 0,
        orphan_storage_files_found: 0,
        orphan_storage_files_removed: 0,
        orphan_storage_files_skipped_protected: 0,
        errors: [],
      });
      return new Response(
        JSON.stringify({
          success: true,
          disabled: true,
          message: "Media retention cleanup is temporarily disabled. Ảnh/video không bị xóa.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    const cutoffMs = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs).toISOString();
    const summary: CleanupSummary = {
      channel_images_deleted: 0,
      carousel_images_deleted: 0,
      videos_deleted: 0,
      storage_files_removed: 0,
      storage_files_skipped_protected: 0,
      storage_files_skipped_missing: 0,
      orphan_storage_files_found: 0,
      orphan_storage_files_removed: 0,
      orphan_storage_files_skipped_protected: 0,
      errors: [],
    };

    console.log(`[cleanup-old-media] Cutoff: ${cutoff} (older than ${RETENTION_DAYS} days), triggered_by=${triggeredBy}`);

    const filesByBucket: Record<string, Set<string>> = {};
    const queueDelete = (url: string | null | undefined) => {
      const parsed = parseStorageUrl(url);
      if (!parsed) return;
      (filesByBucket[parsed.bucket] ??= new Set()).add(parsed.path);
    };

    // 1) channel_image_history
    {
      const { data, error } = await supabase
        .from("channel_image_history")
        .select("id, image_url")
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`channel_image_history fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r: any) => queueDelete(r.image_url));
        const ids = data.map((r: any) => r.id);
        const { error: delErr } = await supabase.from("channel_image_history").delete().in("id", ids);
        if (delErr) summary.errors.push(`channel_image_history delete: ${delErr.message}`);
        else summary.channel_images_deleted = ids.length;
      }
    }

    // 2) carousel_images
    {
      const { data, error } = await supabase
        .from("carousel_images")
        .select("id, image_url")
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`carousel_images fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r: any) => queueDelete(r.image_url));
        const ids = data.map((r: any) => r.id);
        const { error: delErr } = await supabase.from("carousel_images").delete().in("id", ids);
        if (delErr) summary.errors.push(`carousel_images delete: ${delErr.message}`);
        else summary.carousel_images_deleted = ids.length;
      }
    }

    // 3) video_generations
    {
      const { data, error } = await supabase
        .from("video_generations")
        .select("id, video_url, thumbnail_url")
        .in("status", ["completed", "failed"])
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`video_generations fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r: any) => {
          queueDelete(r.video_url);
          queueDelete(r.thumbnail_url);
        });
        const ids = data.map((r: any) => r.id);
        const { error: delErr } = await supabase.from("video_generations").delete().in("id", ids);
        if (delErr) summary.errors.push(`video_generations delete: ${delErr.message}`);
        else summary.videos_deleted = ids.length;
      }
    }

    // 4) Build "protected paths" (URL còn được tham chiếu trong DB sau cleanup).
    const protectedPaths: Record<string, Set<string>> = {};
    const addProtected = (url: string | null | undefined) => {
      const parsed = parseStorageUrl(url);
      if (!parsed) return;
      (protectedPaths[parsed.bucket] ??= new Set()).add(parsed.path);
    };

    const [allCh, allCar, allVid] = await Promise.all([
      supabase.from("channel_image_history").select("image_url").not("image_url", "is", null).limit(20000),
      supabase.from("carousel_images").select("image_url").not("image_url", "is", null).limit(20000),
      supabase.from("video_generations").select("video_url, thumbnail_url").limit(20000),
    ]);

    if (allCh.error) summary.errors.push(`protect channel_image_history: ${allCh.error.message}`);
    else allCh.data?.forEach((r: any) => addProtected(r.image_url));

    if (allCar.error) summary.errors.push(`protect carousel_images: ${allCar.error.message}`);
    else allCar.data?.forEach((r: any) => addProtected(r.image_url));

    if (allVid.error) summary.errors.push(`protect video_generations: ${allVid.error.message}`);
    else allVid.data?.forEach((r: any) => {
      addProtected(r.video_url);
      addProtected(r.thumbnail_url);
    });

    // 5) Xóa file storage được queue từ DB (file vừa bị mất bản ghi DB)
    for (const [bucket, pathSet] of Object.entries(filesByBucket)) {
      const protectedSet = protectedPaths[bucket] ?? new Set<string>();
      const toRemove: string[] = [];
      for (const p of pathSet) {
        if (protectedSet.has(p)) summary.storage_files_skipped_protected++;
        else toRemove.push(p);
      }
      for (let i = 0; i < toRemove.length; i += 100) {
        const chunk = toRemove.slice(i, i + 100);
        const { data: removed, error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) {
          if (/not found/i.test(error.message)) {
            summary.storage_files_skipped_missing += chunk.length;
          } else {
            summary.errors.push(`storage[${bucket}]: ${error.message}`);
          }
        }
        if (removed) summary.storage_files_removed += removed.length;
      }
    }

    // 6) Quét file mồ côi trong các bucket media (file storage cũ >7d, không được DB tham chiếu).
    for (const bucket of MEDIA_BUCKETS) {
      try {
        const all = await listAllFiles(supabase, bucket);
        const protectedSet = protectedPaths[bucket] ?? new Set<string>();
        const orphans: string[] = [];

        for (const file of all) {
          const ts = file.created_at ? Date.parse(file.created_at) : NaN;
          // Nếu thiếu created_at thì coi như cũ để không kẹt file rác vĩnh viễn.
          const isOld = Number.isFinite(ts) ? ts < cutoffMs : true;
          if (!isOld) continue;
          summary.orphan_storage_files_found++;
          if (protectedSet.has(file.path)) {
            summary.orphan_storage_files_skipped_protected++;
            continue;
          }
          orphans.push(file.path);
        }

        for (let i = 0; i < orphans.length; i += 100) {
          const chunk = orphans.slice(i, i + 100);
          const { data: removed, error } = await supabase.storage.from(bucket).remove(chunk);
          if (error) {
            if (/not found/i.test(error.message)) {
              summary.storage_files_skipped_missing += chunk.length;
            } else {
              summary.errors.push(`orphan-scan[${bucket}]: ${error.message}`);
            }
          }
          if (removed) summary.orphan_storage_files_removed += removed.length;
        }
      } catch (e) {
        summary.errors.push(`orphan-scan[${bucket}] fatal: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log(`[cleanup-old-media] Done:`, summary);

    const finalStatus: "success" | "partial" = summary.errors.length === 0 ? "success" : "partial";
    await writeLog(finalStatus, summary);

    return new Response(JSON.stringify({ success: true, retention_days: RETENTION_DAYS, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[cleanup-old-media] Error:", error);
    await writeLog("failed", null, msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}));
