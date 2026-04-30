// Stitch multi-scene videos + voiceover + bgm + (optional) burn-in subtitles via Creatomate
// Submit-only: returns render_job_id immediately. Background poller updates status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkUnitQuota, buildQuotaExceededResponse } from "../_shared/quota-units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RenderAspect = "9:16" | "16:9" | "1:1" | "2:3" | "4:5";

interface RenderRequest {
  clip_urls: string[]; // ordered list of video URLs (scenes)
  voiceover_url?: string;
  bgm_url?: string;
  bgm_volume?: number; // 0-1, default 0.2
  subtitle_srt?: string;
  burn_subtitles?: boolean;
  aspect_ratio?: RenderAspect;
  storyboard_id?: string;
  script_id?: string;
  source_clip_ids?: string[];
  organization_id?: string;
}

// Output dims theo platform native spec 2026
// 2:3 → Pinterest 1000×1500, 4:5 → IG portrait 1080×1350
const ASPECT_DIMS: Record<RenderAspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
  "1:1":  { width: 1080, height: 1080 },
  "2:3":  { width: 1000, height: 1500 },
  "4:5":  { width: 1080, height: 1350 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("CREATOMATE_API_KEY");
    if (!apiKey) return json({ error: "CREATOMATE_API_KEY not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json() as RenderRequest;
    if (!body.clip_urls || body.clip_urls.length === 0) {
      return json({ error: "clip_urls required" }, 400);
    }

    // Resolve org_id (prefer client-provided, else lookup from membership)
    let organizationId = body.organization_id ?? null;
    if (!organizationId) {
      const { data: orgRow } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      organizationId = orgRow?.organization_id ?? null;
    }

    // ───────── QUOTA CHECK (1 render = 1 video output) ─────────
    if (organizationId) {
      const quota = await checkUnitQuota(supabase, organizationId, 'video', 1);
      if (!quota.allowed) {
        console.warn(`[creatomate] quota exceeded org=${organizationId}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    const aspect: RenderAspect = (body.aspect_ratio as RenderAspect) ?? "9:16";
    const dims = ASPECT_DIMS[aspect] ?? ASPECT_DIMS["9:16"];
    const burnSubs = body.burn_subtitles !== false && !!body.subtitle_srt;

    // Build Creatomate source JSON
    const elements: any[] = [];

    // Video tracks (sequential). Smart-crop: cover + center anchor (giữ subject).
    body.clip_urls.forEach((url, i) => {
      elements.push({
        type: "video",
        track: 1,
        source: url,
        fit: "cover",
        x_alignment: "50%",
        y_alignment: "50%",
        ...(i === 0 ? {} : { time: null }), // sequential auto
      });
    });

    // Voiceover (track 2)
    if (body.voiceover_url) {
      elements.push({
        type: "audio",
        track: 2,
        source: body.voiceover_url,
        time: 0,
        volume: 1.0,
      });
    }

    // BGM (track 3, ducked)
    if (body.bgm_url) {
      elements.push({
        type: "audio",
        track: 3,
        source: body.bgm_url,
        time: 0,
        volume: body.bgm_volume ?? 0.2,
        loop: true,
      });
    }

    // Burned subtitles (track 4) using Creatomate's SRT support
    if (burnSubs && body.subtitle_srt) {
      elements.push({
        type: "text",
        track: 4,
        time: 0,
        y_alignment: "85%",
        x_alignment: "50%",
        width: "90%",
        font_family: "Inter",
        font_weight: "700",
        font_size: aspect === "9:16" ? "5 vmin" : "4 vmin",
        fill_color: "#ffffff",
        stroke_color: "#000000",
        stroke_width: "0.3 vmin",
        background_color: "rgba(0,0,0,0.4)",
        background_x_padding: "3%",
        background_y_padding: "1.5%",
        background_border_radius: "1 vmin",
        text_transcript_source: body.subtitle_srt,
      });
    }

    const source = {
      output_format: "mp4",
      width: dims.width,
      height: dims.height,
      frame_rate: 30,
      elements,
    };

    // Submit to Creatomate
    const cmRes = await fetch("https://api.creatomate.com/v1/renders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source }),
    });

    if (!cmRes.ok) {
      const errTxt = await cmRes.text();
      console.error("[creatomate] submit err", cmRes.status, errTxt);
      return json({ error: `Creatomate: ${cmRes.status}`, details: errTxt }, 500);
    }

    const cmData = await cmRes.json();
    const renders = Array.isArray(cmData) ? cmData : [cmData];
    const first = renders[0];
    const renderId: string = first.id;
    const status: string = first.status; // 'planned'|'transcribing'|'rendering'|'succeeded'|'failed'

    // Persist
    const { data: jobRow, error: insErr } = await supabase
      .from("video_render_jobs")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        storyboard_id: body.storyboard_id ?? null,
        script_id: body.script_id ?? null,
        source_clip_ids: body.source_clip_ids ?? [],
        voiceover_url: body.voiceover_url ?? null,
        bgm_url: body.bgm_url ?? null,
        subtitle_srt: body.subtitle_srt ?? null,
        burn_subtitles: burnSubs,
        aspect_ratio: aspect,
        provider: "creatomate",
        provider_render_id: renderId,
        status: status === "succeeded" ? "completed" : "processing",
        progress: 5,
        output_url: first.url ?? null,
        cost_estimate: 0.05 * body.clip_urls.length, // rough estimate
      })
      .select()
      .single();

    if (insErr) {
      console.error("[creatomate] db err", insErr);
      return json({ error: "DB insert failed" }, 500);
    }

    return json({ success: true, render_job: jobRow, provider_render_id: renderId });
  } catch (e) {
    console.error("[creatomate] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
