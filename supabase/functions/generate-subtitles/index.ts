// Subtitle generation via ElevenLabs Speech-to-Text (scribe_v2)
// Input: audio_url (or video_url - will try to extract audio inline)
// Output: SRT + VTT, persisted as audio_assets row
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkUnitQuota, buildQuotaExceededResponse } from "../_shared/quota-units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);

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

    const body = await req.json();
    const mediaUrl: string = body.media_url;
    const language: string = body.language ?? "vie"; // ISO 639-3
    let organizationId: string | null = body.organization_id ?? null;
    if (!mediaUrl) return json({ error: "media_url required" }, 400);

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

    if (organizationId) {
      const quota = await checkUnitQuota(supabase, organizationId, 'content', 1);
      if (!quota.allowed) {
        console.warn(`[subtitles] quota exceeded org=${organizationId}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    // Download media
    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) return json({ error: `Cannot fetch media: ${mediaRes.status}` }, 400);
    const mediaBlob = await mediaRes.blob();

    // Send to ElevenLabs STT
    const formData = new FormData();
    formData.append("file", mediaBlob, "media.mp4");
    formData.append("model_id", "scribe_v2");
    formData.append("diarize", "false");
    formData.append("language_code", language);

    const sttRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
    });

    if (!sttRes.ok) {
      const errTxt = await sttRes.text();
      console.error("[subtitles] STT err", sttRes.status, errTxt);
      return json({ error: `STT failed: ${sttRes.status}` }, 500);
    }

    const result = await sttRes.json();
    const words: Array<{ text: string; start: number; end: number }> = result.words ?? [];
    if (words.length === 0) return json({ error: "No speech detected" }, 400);

    // Build SRT + VTT (group words into ~6-word chunks of max 3s)
    const segments = chunkWords(words);
    const srt = buildSRT(segments);
    const vtt = buildVTT(segments);
    const totalDur = words[words.length - 1].end;

    const { data: asset, error: insErr } = await supabase
      .from("audio_assets")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        asset_type: "subtitle",
        source_text: result.text,
        language,
        duration_seconds: totalDur,
        srt_content: srt,
        vtt_content: vtt,
        provider: "elevenlabs",
        cost_estimate: (totalDur / 60) * 0.40, // ~$0.40/min
        metadata: { word_count: words.length, segment_count: segments.length },
      })
      .select()
      .single();
    if (insErr) return json({ error: "DB insert failed" }, 500);

    return json({ success: true, asset, srt, vtt });
  } catch (e) {
    console.error("[subtitles] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function chunkWords(words: Array<{ text: string; start: number; end: number }>) {
  const out: Array<{ start: number; end: number; text: string }> = [];
  let cur: typeof words = [];
  for (const w of words) {
    cur.push(w);
    const dur = w.end - cur[0].start;
    if (cur.length >= 7 || dur >= 3 || /[.!?]$/.test(w.text)) {
      out.push({ start: cur[0].start, end: w.end, text: cur.map(x => x.text).join(" ").replace(/\s+([,.!?])/g, "$1") });
      cur = [];
    }
  }
  if (cur.length) out.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map(x => x.text).join(" ") });
  return out;
}

function fmt(t: number, sep = ",") {
  const h = Math.floor(t / 3600).toString().padStart(2, "0");
  const m = Math.floor((t % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  const ms = Math.floor((t % 1) * 1000).toString().padStart(3, "0");
  return `${h}:${m}:${s}${sep}${ms}`;
}

function buildSRT(segs: Array<{ start: number; end: number; text: string }>) {
  return segs.map((s, i) => `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}\n`).join("\n");
}

function buildVTT(segs: Array<{ start: number; end: number; text: string }>) {
  return "WEBVTT\n\n" + segs.map(s => `${fmt(s.start, ".")} --> ${fmt(s.end, ".")}\n${s.text}\n`).join("\n");
}

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
