// Polls Creatomate render jobs every 30s and updates video_render_jobs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_POLL_ATTEMPTS = 60; // 30 min @ 30s

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("CREATOMATE_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: jobs, error } = await supabase
      .from("video_render_jobs")
      .select("*")
      .eq("status", "processing")
      .lt("poll_attempts", MAX_POLL_ATTEMPTS)
      .order("last_polled_at", { ascending: true, nullsFirst: true })
      .limit(20);

    if (error) {
      console.error("[render-poller] query err", error);
      return json({ error: "query failed" }, 500);
    }

    if (!jobs || jobs.length === 0) {
      return json({ checked: 0, completed: 0, failed: 0, still_processing: 0 });
    }

    let completed = 0, failed = 0, stillProcessing = 0;

    for (const job of jobs) {
      try {
        if (!job.provider_render_id || !apiKey) {
          await markFailed(supabase, job.id, "missing render id or API key");
          failed++;
          continue;
        }

        const cmRes = await fetch(`https://api.creatomate.com/v1/renders/${job.provider_render_id}`, {
          headers: { "Authorization": `Bearer ${apiKey}` },
        });

        if (!cmRes.ok) {
          await supabase.from("video_render_jobs").update({
            poll_attempts: job.poll_attempts + 1,
            last_polled_at: new Date().toISOString(),
          }).eq("id", job.id);
          stillProcessing++;
          continue;
        }

        const cm = await cmRes.json();
        const status: string = cm.status;

        if (status === "succeeded") {
          await supabase.from("video_render_jobs").update({
            status: "completed",
            progress: 100,
            output_url: cm.url,
            thumbnail_url: cm.snapshot_url ?? null,
            duration_seconds: cm.duration ?? null,
            completed_at: new Date().toISOString(),
            poll_attempts: job.poll_attempts + 1,
            last_polled_at: new Date().toISOString(),
          }).eq("id", job.id);
          completed++;
        } else if (status === "failed") {
          await markFailed(supabase, job.id, cm.error_message ?? "Creatomate render failed");
          failed++;
        } else {
          // planned | transcribing | rendering
          const progress = Math.min(90, 10 + Math.floor((job.poll_attempts / MAX_POLL_ATTEMPTS) * 80));
          await supabase.from("video_render_jobs").update({
            poll_attempts: job.poll_attempts + 1,
            last_polled_at: new Date().toISOString(),
            progress,
          }).eq("id", job.id);
          stillProcessing++;

          if (job.poll_attempts + 1 >= MAX_POLL_ATTEMPTS) {
            await markFailed(supabase, job.id, "Render timeout after 30 min");
          }
        }
      } catch (e) {
        console.error("[render-poller] job err", job.id, e);
        stillProcessing++;
      }
    }

    return json({ checked: jobs.length, completed, failed, still_processing: stillProcessing });
  } catch (e) {
    console.error("[render-poller] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

async function markFailed(supabase: any, id: string, msg: string) {
  await supabase.from("video_render_jobs").update({
    status: "failed",
    error_message: msg,
    completed_at: new Date().toISOString(),
  }).eq("id", id);
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
