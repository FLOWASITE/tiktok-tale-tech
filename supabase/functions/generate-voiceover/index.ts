// Voiceover TTS via ElevenLabs - returns persisted audio_assets row + public URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { checkUnitQuota, buildQuotaExceededResponse } from "../_shared/quota-units.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default Vietnamese-friendly voice (Sarah - multilingual)
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return json({ error: "ELEVENLABS_API_KEY not configured" }, 500);
    }

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
    const text: string = (body.text ?? "").toString().trim();
    const voiceId: string = body.voice_id ?? DEFAULT_VOICE_ID;
    const language: string = body.language ?? "vi";
    const scriptId: string | null = body.script_id ?? null;
    const preview: boolean = body.preview === true;
    let organizationId: string | null = body.organization_id ?? null;

    if (!text || text.length < 2) return json({ error: "text too short" }, 400);
    if (preview && text.length > 500) return json({ error: "preview text > 500 chars" }, 400);
    if (!preview && text.length > 5000) return json({ error: "text > 5000 chars" }, 400);

    // Resolve org_id if not provided
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

    // Quota check (audio asset = 1 unit "content")
    if (organizationId) {
      const quota = await checkUnitQuota(supabase, organizationId, 'content', 1);
      if (!quota.allowed) {
        console.warn(`[voiceover] quota exceeded org=${organizationId}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    // ElevenLabs TTS
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errTxt = await ttsRes.text();
      console.error("[voiceover] ElevenLabs error", ttsRes.status, errTxt);
      if (ttsRes.status === 429) return json({ error: "Rate limited" }, 429);
      if (ttsRes.status === 401) return json({ error: "Invalid ElevenLabs key" }, 500);
      return json({ error: `TTS failed: ${ttsRes.status}` }, 500);
    }

    const audioBuf = await ttsRes.arrayBuffer();

    // Preview mode: return base64 audio without persisting
    if (preview) {
      const b64 = base64Encode(audioBuf);
      return json({ success: true, preview: true, audio_base64: b64, format: 'mp3', chars: text.length });
    }

    const filename = `${user.id}/voiceover-${Date.now()}.mp3`;

    // Upload to storage
    const { error: upErr } = await supabase.storage
      .from("audio-assets")
      .upload(filename, audioBuf, { contentType: "audio/mpeg", upsert: false });

    if (upErr) {
      console.error("[voiceover] upload err", upErr);
      return json({ error: "Storage upload failed" }, 500);
    }

    const { data: pub } = supabase.storage.from("audio-assets").getPublicUrl(filename);

    // Estimate duration: ~150 chars/min for Vietnamese
    const estDuration = Math.max(2, Math.ceil((text.length / 150) * 60));
    // Cost: ElevenLabs ~$0.30/1k chars
    const cost = (text.length / 1000) * 0.30;

    const { data: asset, error: insErr } = await supabase
      .from("audio_assets")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        script_id: scriptId,
        asset_type: "voiceover",
        source_text: text,
        voice_id: voiceId,
        language,
        duration_seconds: estDuration,
        audio_url: pub.publicUrl,
        provider: "elevenlabs",
        cost_estimate: cost,
        metadata: { model: "eleven_multilingual_v2", chars: text.length },
      })
      .select()
      .single();

    if (insErr) {
      console.error("[voiceover] insert err", insErr);
      return json({ error: "DB insert failed" }, 500);
    }

    return json({ success: true, asset });
  } catch (e) {
    console.error("[voiceover] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
