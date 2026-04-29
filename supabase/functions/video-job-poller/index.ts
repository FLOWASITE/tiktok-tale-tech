// ============================================
// video-job-poller — pg_cron driven background poller
// Scans video_generations rows in 'processing' state and asks the provider for status.
// Marks completed / failed / still-processing. Caps at 60 attempts (~30 min).
// Public function (no JWT) — invoked by pg_cron with anon key.
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";
import { checkGeminiGenVideoStatus } from "../_shared/geminigen-video-generator.ts";
import { checkPoyoVideoStatus } from "../_shared/poyo-video-generator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_POLL_ATTEMPTS = 60;       // ~30 min @ 30s cron
const BATCH_SIZE = 20;              // jobs per cron tick
const PROGRESS_PER_ATTEMPT = 1.3;   // ~10 → ~88% over 60 attempts

interface VideoJobRow {
  id: string;
  provider: 'geminigen' | 'poyo' | 'lovable' | 'minimax' | 'runway';
  provider_task_id: string | null;
  poll_attempts: number;
  progress: number;
  created_at: string;
}

Deno.serve(withPerf({ functionName: 'video-job-poller', slowThresholdMs: 60000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch processing jobs ordered by oldest poll first
  const { data: jobs, error: fetchError } = await supabase
    .from('video_generations')
    .select('id, provider, provider_task_id, poll_attempts, progress, created_at')
    .eq('status', 'processing')
    .lt('poll_attempts', MAX_POLL_ATTEMPTS)
    .not('provider_task_id', 'is', null)
    .order('last_polled_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('[video-job-poller] fetch error:', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ checked: 0, completed: 0, failed: 0, still_processing: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[video-job-poller] Checking ${jobs.length} job(s)`);

  const geminigenKey = Deno.env.get("GEMINIGEN_API_KEY");
  const poyoKey = Deno.env.get("POYO_API_KEY");

  let completed = 0, failed = 0, stillProcessing = 0;
  const nowIso = new Date().toISOString();

  const results = await Promise.allSettled(
    (jobs as VideoJobRow[]).map(async (job) => {
      const taskId = job.provider_task_id!;
      let result: { status: 'processing' | 'completed' | 'failed'; videoUrl?: string; thumbnailUrl?: string; error?: string };

      try {
        if (job.provider === 'geminigen') {
          if (!geminigenKey) throw new Error('GEMINIGEN_API_KEY missing');
          result = await checkGeminiGenVideoStatus(taskId, geminigenKey);
        } else if (job.provider === 'poyo') {
          if (!poyoKey) throw new Error('POYO_API_KEY missing');
          result = await checkPoyoVideoStatus(taskId, poyoKey);
        } else {
          // Unsupported in async mode — mark failed
          result = { status: 'failed', error: `Provider "${job.provider}" has no async poller` };
        }
      } catch (e) {
        console.warn(`[video-job-poller] job ${job.id} check error:`, e);
        result = { status: 'processing' };  // keep alive
      }

      const nextAttempts = job.poll_attempts + 1;

      if (result.status === 'completed' && result.videoUrl) {
        await supabase.from('video_generations').update({
          status: 'completed',
          video_url: result.videoUrl,
          thumbnail_url: result.thumbnailUrl ?? null,
          progress: 100,
          completed_at: nowIso,
          last_polled_at: nowIso,
          poll_attempts: nextAttempts,
          generation_time_ms: Date.now() - new Date(job.created_at).getTime(),
        }).eq('id', job.id);
        completed++;
        return;
      }

      if (result.status === 'failed') {
        await supabase.from('video_generations').update({
          status: 'failed',
          error_message: result.error ?? 'Provider returned failure',
          completed_at: nowIso,
          last_polled_at: nowIso,
          poll_attempts: nextAttempts,
          progress: 100,
        }).eq('id', job.id);
        failed++;
        return;
      }

      // Still processing — bump attempts + estimate progress
      const estProgress = Math.min(90, Math.round(10 + nextAttempts * PROGRESS_PER_ATTEMPT));
      const isTimeout = nextAttempts >= MAX_POLL_ATTEMPTS;

      await supabase.from('video_generations').update({
        status: isTimeout ? 'failed' : 'processing',
        error_message: isTimeout ? 'TIMEOUT_AFTER_30MIN: provider did not finish in time' : null,
        completed_at: isTimeout ? nowIso : null,
        last_polled_at: nowIso,
        poll_attempts: nextAttempts,
        progress: isTimeout ? 100 : estProgress,
      }).eq('id', job.id);

      if (isTimeout) failed++;
      else stillProcessing++;
    })
  );

  const errored = results.filter(r => r.status === 'rejected').length;
  if (errored > 0) console.warn(`[video-job-poller] ${errored} job(s) had unhandled errors`);

  return new Response(JSON.stringify({
    checked: jobs.length, completed, failed, still_processing: stillProcessing,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}));
