import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RETENTION_DAYS = 7;

interface CleanupSummary {
  channel_images_deleted: number;
  carousel_images_deleted: number;
  videos_deleted: number;
  storage_files_removed: number;
  storage_files_skipped_protected: number;
  storage_files_skipped_missing: number;
  errors: string[];
}

/**
 * Extract { bucket, path } from a public Supabase storage URL.
 * Format: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

Deno.serve(withPerf({ functionName: 'cleanup-old-media', slowThresholdMs: 60000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const summary: CleanupSummary = {
      channel_images_deleted: 0,
      carousel_images_deleted: 0,
      videos_deleted: 0,
      storage_files_removed: 0,
      storage_files_skipped_protected: 0,
      storage_files_skipped_missing: 0,
      errors: [],
    };

    console.log(`[cleanup-old-media] Cutoff: ${cutoff} (older than ${RETENTION_DAYS} days)`);

    // Use Set per-bucket to auto-dedupe paths
    const filesByBucket: Record<string, Set<string>> = {};
    const queueDelete = (url: string | null | undefined) => {
      const parsed = parseStorageUrl(url);
      if (!parsed) return;
      (filesByBucket[parsed.bucket] ??= new Set()).add(parsed.path);
    };

    // 1) channel_image_history — xóa TẤT CẢ >7 ngày (kể cả is_selected=true)
    {
      const { data, error } = await supabase
        .from("channel_image_history")
        .select("id, image_url")
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`channel_image_history fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r) => queueDelete(r.image_url));
        const ids = data.map((r) => r.id);
        const { error: delErr } = await supabase.from("channel_image_history").delete().in("id", ids);
        if (delErr) summary.errors.push(`channel_image_history delete: ${delErr.message}`);
        else summary.channel_images_deleted = ids.length;
      }
    }

    // 2) carousel_images — xóa TẤT CẢ >7 ngày (kể cả is_selected=true)
    {
      const { data, error } = await supabase
        .from("carousel_images")
        .select("id, image_url")
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`carousel_images fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r) => queueDelete(r.image_url));
        const ids = data.map((r) => r.id);
        const { error: delErr } = await supabase.from("carousel_images").delete().in("id", ids);
        if (delErr) summary.errors.push(`carousel_images delete: ${delErr.message}`);
        else summary.carousel_images_deleted = ids.length;
      }
    }

    // 3) video_generations — completed/failed older than 7 days
    {
      const { data, error } = await supabase
        .from("video_generations")
        .select("id, video_url, thumbnail_url")
        .in("status", ["completed", "failed"])
        .lt("created_at", cutoff)
        .limit(1000);
      if (error) summary.errors.push(`video_generations fetch: ${error.message}`);
      else if (data?.length) {
        data.forEach((r) => {
          queueDelete(r.video_url);
          queueDelete(r.thumbnail_url);
        });
        const ids = data.map((r) => r.id);
        const { error: delErr } = await supabase.from("video_generations").delete().in("id", ids);
        if (delErr) summary.errors.push(`video_generations delete: ${delErr.message}`);
        else summary.videos_deleted = ids.length;
      }
    }

    // 4) Build "protected URL" set from records that survived (still referenced).
    // If ANY surviving record references the same URL, we skip the storage delete
    // for that path to avoid breaking ảnh user đang dùng.
    const protectedPaths: Record<string, Set<string>> = {};
    const addProtected = (url: string | null | undefined) => {
      const parsed = parseStorageUrl(url);
      if (!parsed) return;
      (protectedPaths[parsed.bucket] ??= new Set()).add(parsed.path);
    };

    if (Object.keys(filesByBucket).length > 0) {
      const [keepCh, keepCar, keepVid] = await Promise.all([
        supabase
          .from("channel_image_history")
          .select("image_url")
          .or(`is_selected.eq.true,created_at.gte.${cutoff}`)
          .not("image_url", "is", null)
          .limit(10000),
        supabase
          .from("carousel_images")
          .select("image_url")
          .or(`is_selected.eq.true,created_at.gte.${cutoff}`)
          .not("image_url", "is", null)
          .limit(10000),
        supabase
          .from("video_generations")
          .select("video_url, thumbnail_url")
          .or(`status.not.in.(completed,failed),created_at.gte.${cutoff}`)
          .limit(10000),
      ]);

      if (keepCh.error) summary.errors.push(`protect channel_image_history: ${keepCh.error.message}`);
      else keepCh.data?.forEach((r: { image_url: string | null }) => addProtected(r.image_url));

      if (keepCar.error) summary.errors.push(`protect carousel_images: ${keepCar.error.message}`);
      else keepCar.data?.forEach((r: { image_url: string | null }) => addProtected(r.image_url));

      if (keepVid.error) summary.errors.push(`protect video_generations: ${keepVid.error.message}`);
      else
        keepVid.data?.forEach((r: { video_url: string | null; thumbnail_url: string | null }) => {
          addProtected(r.video_url);
          addProtected(r.thumbnail_url);
        });
    }

    // 5) Batch remove files from storage per bucket — dedupe + protect
    for (const [bucket, pathSet] of Object.entries(filesByBucket)) {
      const protectedSet = protectedPaths[bucket] ?? new Set<string>();
      const toRemove: string[] = [];
      for (const p of pathSet) {
        if (protectedSet.has(p)) {
          summary.storage_files_skipped_protected++;
        } else {
          toRemove.push(p);
        }
      }
      if (!toRemove.length) continue;

      // chunk by 100
      for (let i = 0; i < toRemove.length; i += 100) {
        const chunk = toRemove.slice(i, i + 100);
        const { data: removed, error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) {
          // "Object not found" is benign noise — race with prior run or stale URL
          const msg = error.message || "";
          if (/not found/i.test(msg)) {
            summary.storage_files_skipped_missing += chunk.length;
            console.warn(`[cleanup-old-media] storage[${bucket}] missing (benign):`, msg);
          } else {
            summary.errors.push(`storage[${bucket}]: ${msg}`);
          }
        }
        // Count actually-removed by response length, not by request length
        if (removed) summary.storage_files_removed += removed.length;
      }
    }

    console.log(`[cleanup-old-media] Done:`, summary);

    return new Response(JSON.stringify({ success: true, retention_days: RETENTION_DAYS, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[cleanup-old-media] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
