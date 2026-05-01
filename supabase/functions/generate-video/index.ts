// ============================================
// generate-video — submit-only async pipeline (Phase 3)
// Submits task to provider, persists provider_task_id, returns immediately.
// Background `video-job-poller` (pg_cron) checks status & updates row.
// Legacy sync mode still available via { sync: true } in body.
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import {
  generateVideoViaGeminiGen,
  submitGeminiGenVideoTask,
  GEMINIGEN_VIDEO_MODELS,
} from "../_shared/geminigen-video-generator.ts";
import {
  generateVideoViaPoyo,
  submitPoyoVideoTask,
  POYO_VIDEO_MODELS,
  type PoyoVideoModel,
} from "../_shared/poyo-video-generator.ts";
import { checkUnitQuota, buildQuotaExceededResponse } from "../_shared/quota-units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VideoProvider = 'geminigen' | 'poyo' | 'lovable' | 'minimax' | 'runway';

interface VideoGenerationRequest {
  provider: VideoProvider;
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  starting_frame_url?: string;
  negative_prompt?: string;
  script_id?: string;
  storyboard_id?: string;
  scene_number?: number;
  sync?: boolean;  // if true, wait inline (legacy / agent flow)
}

Deno.serve(withPerf({ functionName: 'generate-video', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: VideoGenerationRequest = await req.json();
    const {
      provider: requestedProvider = 'geminigen',
      prompt,
      model: clientModel,
      duration: clientDuration,
      aspect_ratio: clientAspect,
      resolution: clientResolution,
      starting_frame_url,
      negative_prompt,
      script_id,
      storyboard_id,
      scene_number,
      sync = false,
    } = body;

    if (!prompt || prompt.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Prompt must be at least 5 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve org_id for the user (for RLS-friendly insert)
    const { data: orgRow } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // ───────── QUOTA CHECK (Pricing v2 — unit "video") ─────────
    if (orgRow?.organization_id) {
      const quota = await checkUnitQuota(supabase, orgRow.organization_id, 'video', 1);
      if (!quota.allowed) {
        console.warn(`[generate-video] quota exceeded org=${orgRow.organization_id}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    // ───────── ADMIN-CONTROLLED MODEL RESOLUTION ─────────
    // Priority cascade (matches mem://ai-system/model-selection-priority-vn):
    //   1. Client `model` (only respected if request comes from agent/internal pipelines — kept for backward compat)
    //   2. Admin `ai_function_configs.model_override` for `generate-video`
    //   3. Hard default per provider
    let resolvedModel = clientModel || null;
    let resolvedProvider: VideoProvider = requestedProvider;
    let adminParams: Record<string, any> = {};

    // Always fetch admin parameters jsonb for fallback defaults (duration/aspect/resolution)
    try {
      const { data: paramRow } = await supabase
        .from('ai_function_configs')
        .select('parameters')
        .eq('function_name', 'generate-video')
        .eq('is_enabled', true)
        .or(orgRow?.organization_id
          ? `organization_id.eq.${orgRow.organization_id},organization_id.is.null`
          : `organization_id.is.null`)
        .order('organization_id', { nullsFirst: false })
        .limit(1)
        .maybeSingle();
      adminParams = (paramRow?.parameters as Record<string, any>) || {};
    } catch (paramErr) {
      console.warn('[generate-video] admin parameters fetch failed:', paramErr);
    }

    if (!resolvedModel) {
      try {
        const cfg = await getAIConfig('generate-video', orgRow?.organization_id ?? undefined);
        if (cfg.model) {
          resolvedModel = cfg.model;
          // If admin-configured model has a provider prefix (e.g. "geminigen/..." or "poyo/..."),
          // override the requested provider so routing matches the model.
          if (cfg.model.startsWith('poyo/')) resolvedProvider = 'poyo';
          else if (cfg.model.startsWith('geminigen/')) resolvedProvider = 'geminigen';
        }
        if (cfg.force_provider) {
          resolvedProvider = cfg.force_provider as VideoProvider;
        }
      } catch (cfgErr) {
        console.warn('[generate-video] getAIConfig failed, using fallback:', cfgErr);
      }
    }

    const provider = resolvedProvider;
    const model = resolvedModel || undefined;

    // Resolve duration/aspect/resolution: client value wins, else admin params fallback, else hard default
    const duration = clientDuration ?? adminParams.default_duration ?? 5;
    const aspect_ratio = clientAspect ?? adminParams.default_aspect_ratio ?? '9:16';
    const resolution = clientResolution ?? adminParams.default_resolution ?? '1080p';

    console.log(`[generate-video] provider=${provider} model=${model} (admin=${!clientModel}) duration=${duration}s aspect=${aspect_ratio} res=${resolution} sync=${sync}`);

    // Create job row (pending → will flip to processing after submit)
    const { data: job, error: jobError } = await supabase
      .from('video_generations')
      .insert({
        script_id,
        storyboard_id,
        scene_number,
        provider,
        model_used: model,
        prompt,
        negative_prompt,
        duration_seconds: duration,
        aspect_ratio,
        resolution,
        starting_frame_url,
        status: 'pending',
        progress: 5,
        user_id: user.id,
        organization_id: orgRow?.organization_id ?? null,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[generate-video] Insert failed:', jobError);
      throw new Error('Failed to create video job: ' + (jobError?.message ?? 'unknown'));
    }

    // ───────── SYNC MODE (legacy) — wait inline ─────────
    if (sync) {
      const startTime = Date.now();
      let videoUrl: string | null = null;
      let errorMsg: string | null = null;

      try {
        if (provider === 'geminigen') {
          const apiKey = Deno.env.get("GEMINIGEN_API_KEY");
          if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');
          const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
          const result = await generateVideoViaGeminiGen({
            prompt, model: selectedModel,
            aspectRatio: aspect_ratio,
            resolution: resolution === '720p' ? '720p' : '1080p',
            duration, negativePrompt: negative_prompt,
            startingFrameUrl: starting_frame_url,
          }, apiKey);
          videoUrl = result.videoUrl;
        } else if (provider === 'poyo') {
          const apiKey = Deno.env.get("POYO_API_KEY");
          if (!apiKey) throw new Error('POYO_API_KEY not configured');
          const selectedModel = (model && POYO_VIDEO_MODELS.includes(model as PoyoVideoModel)
            ? model : POYO_VIDEO_MODELS[0]) as PoyoVideoModel;
          const result = await generateVideoViaPoyo({
            prompt, model: selectedModel,
            aspectRatio: (aspect_ratio as '16:9' | '9:16' | '1:1') ?? '9:16',
            duration,
            resolution: resolution === '720p' ? '720p' : '1080p',
            startingFrameUrl: starting_frame_url,
            negativePrompt: negative_prompt,
          }, apiKey);
          videoUrl = result.videoUrl;
        } else {
          throw new Error(`Provider "${provider}" not supported in sync mode`);
        }
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Generation failed';
        console.error(`[generate-video] sync ${provider} error:`, e);
      }

      await supabase.from('video_generations').update({
        status: videoUrl ? 'completed' : 'failed',
        video_url: videoUrl,
        error_message: errorMsg,
        generation_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
        progress: 100,
      }).eq('id', job.id);

      if (errorMsg) {
        return new Response(JSON.stringify({ error: errorMsg, job_id: job.id, status: 'failed' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        job_id: job.id, video_url: videoUrl, status: 'completed', provider,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ───────── ASYNC MODE (default) — submit only ─────────
    let providerTaskId: string | null = null;
    let submitError: string | null = null;
    let actualProvider: VideoProvider = provider;

    // Helper: map PoYo model → GeminiGen equivalent for fallback
    const POYO_TO_GEMINIGEN_MAP: Record<string, string> = {
      'poyo/seedance-2': 'geminigen/veo-3.1-fast',
      'poyo/sora-2': 'geminigen/sora-2',
      'poyo/happy-horse': 'geminigen/veo-3.1-fast',
    };

    try {
      if (provider === 'geminigen') {
        const apiKey = Deno.env.get("GEMINIGEN_API_KEY");
        if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');
        const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
        providerTaskId = await submitGeminiGenVideoTask({
          prompt, model: selectedModel,
          aspectRatio: aspect_ratio,
          resolution: resolution === '720p' ? '720p' : '1080p',
          duration, negativePrompt: negative_prompt,
          startingFrameUrl: starting_frame_url,
        }, apiKey);
      } else if (provider === 'poyo') {
        const apiKey = Deno.env.get("POYO_API_KEY");
        if (!apiKey) throw new Error('POYO_API_KEY not configured');
        const selectedModel = (model && POYO_VIDEO_MODELS.includes(model as PoyoVideoModel)
          ? model : POYO_VIDEO_MODELS[0]) as PoyoVideoModel;
        providerTaskId = await submitPoyoVideoTask({
          prompt, model: selectedModel,
          aspectRatio: (aspect_ratio as '16:9' | '9:16' | '1:1') ?? '9:16',
          duration,
          resolution: resolution === '720p' ? '720p' : '1080p',
          startingFrameUrl: starting_frame_url,
          negativePrompt: negative_prompt,
        }, apiKey);
      } else {
        throw new Error(`Provider "${provider}" not supported in async mode (use sync=true).`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Submit failed';
      console.error(`[generate-video] submit ${provider} error:`, e);

      // ───── AUTO-FALLBACK: PoYo 402/credits → GeminiGen ─────
      const isPoyoCreditsError = provider === 'poyo' &&
        (errMsg.includes('402') || errMsg.includes('CREDITS_EXHAUSTED') || errMsg.includes('insufficient_credits'));
      const geminigenKey = Deno.env.get("GEMINIGEN_API_KEY");

      if (isPoyoCreditsError && geminigenKey) {
        const fallbackModel = POYO_TO_GEMINIGEN_MAP[model || 'poyo/seedance-2'] || 'geminigen/veo-3.1-fast';
        console.log(`[generate-video] PoYo credits exhausted → fallback to GeminiGen model=${fallbackModel}`);

        try {
          providerTaskId = await submitGeminiGenVideoTask({
            prompt, model: fallbackModel,
            aspectRatio: aspect_ratio,
            resolution: resolution === '720p' ? '720p' : '1080p',
            duration, negativePrompt: negative_prompt,
            startingFrameUrl: starting_frame_url,
          }, geminigenKey);
          actualProvider = 'geminigen';

          // Update job row with new provider info
          await supabase.from('video_generations').update({
            provider: 'geminigen',
            model_used: fallbackModel,
          }).eq('id', job.id);

          console.log(`[generate-video] GeminiGen fallback succeeded: task=${providerTaskId}`);
        } catch (fallbackErr) {
          console.error(`[generate-video] GeminiGen fallback also failed:`, fallbackErr);
          submitError = `PoYo hết credits, GeminiGen fallback cũng thất bại: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown'}`;
        }
      } else {
        submitError = errMsg;
      }
    }

    if (submitError || !providerTaskId) {
      await supabase.from('video_generations').update({
        status: 'failed',
        error_message: submitError ?? 'Unknown submit error',
        completed_at: new Date().toISOString(),
        progress: 100,
      }).eq('id', job.id);

      const status = submitError?.includes('429') ? 429
                    : submitError?.includes('402') || submitError?.includes('CREDITS') ? 402
                    : 500;
      return new Response(JSON.stringify({ error: submitError, job_id: job.id, status: 'failed' }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing — poller will take over
    await supabase.from('video_generations').update({
      status: 'processing',
      provider_task_id: providerTaskId,
      progress: 10,
      last_polled_at: new Date().toISOString(),
    }).eq('id', job.id);

    console.log(`[generate-video] async job ready: id=${job.id} task=${providerTaskId}`);

    return new Response(JSON.stringify({
      job_id: job.id,
      provider_task_id: providerTaskId,
      status: 'processing',
      provider,
      message: 'Video đang được tạo nền — theo dõi tiến độ qua Realtime hoặc tab Thư viện.',
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[generate-video] Error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const status = errorMessage.includes('429') ? 429
                  : errorMessage.includes('402') ? 402 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
