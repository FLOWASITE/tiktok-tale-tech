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
      errors: [],
    };

    console.log(`[cleanup-old-media] Cutoff: ${cutoff} (older than ${RETENTION_DAYS} days)`);

    // Group storage deletions by bucket for batch removal
    const filesByBucket: Record<string, string[]> = {};
    const queueDelete = (url: string | null | undefined) => {
      const parsed = parseStorageUrl(url);
      if (!parsed) return;
      (filesByBucket[parsed.bucket] ??= []).push(parsed.path);
    };

    // 1) channel_image_history — keep is_selected=true forever
    {
      const { data, error } = await supabase
        .from("channel_image_history")
        .select("id, image_url")
        .eq("is_selected", false)
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

    // 2) carousel_images — keep is_selected=true forever
    {
      const { data, error } = await supabase
        .from("carousel_images")
        .select("id, image_url")
        .eq("is_selected", false)
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

    // 4) Batch remove files from storage per bucket
    for (const [bucket, paths] of Object.entries(filesByBucket)) {
      if (!paths.length) continue;
      // chunk by 100
      for (let i = 0; i < paths.length; i += 100) {
        const chunk = paths.slice(i, i + 100);
        const { error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) summary.errors.push(`storage[${bucket}]: ${error.message}`);
        else summary.storage_files_removed += chunk.length;
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
