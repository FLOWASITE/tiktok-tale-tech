// Background music via ElevenLabs Music API
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
    const prompt: string = (body.prompt ?? "").toString().trim();
    // Cho phép tới 120s để khớp short-form ≤90s + buffer
    const duration: number = Math.min(120, Math.max(5, body.duration ?? 15));
    const scriptId: string | null = body.script_id ?? null;
    let organizationId: string | null = body.organization_id ?? null;
    if (!prompt) return json({ error: "prompt required" }, 400);

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
        console.warn(`[bgm] quota exceeded org=${organizationId}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    const musicRes = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Background instrumental, no vocals: ${prompt}. Royalty-free, broadcast quality.`,
        duration_seconds: duration,
      }),
    });

    if (!musicRes.ok) {
      const errTxt = await musicRes.text();
      console.error("[bgm] error", musicRes.status, errTxt);
      if (musicRes.status === 429) return json({ error: "Rate limited" }, 429);
      if (musicRes.status === 402) return json({ error: "Insufficient ElevenLabs credits" }, 402);
      return json({ error: `Music gen failed: ${musicRes.status}` }, 500);
    }

    const audioBuf = await musicRes.arrayBuffer();
    const filename = `${user.id}/bgm-${Date.now()}.mp3`;

    const { error: upErr } = await supabase.storage
      .from("audio-assets")
      .upload(filename, audioBuf, { contentType: "audio/mpeg", upsert: false });
    if (upErr) return json({ error: "Storage upload failed" }, 500);

    const { data: pub } = supabase.storage.from("audio-assets").getPublicUrl(filename);
    const cost = duration * 0.08; // estimate ~$0.08/sec

    const { data: asset, error: insErr } = await supabase
      .from("audio_assets")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        script_id: scriptId,
        asset_type: "music",
        prompt,
        duration_seconds: duration,
        audio_url: pub.publicUrl,
        provider: "elevenlabs",
        cost_estimate: cost,
        metadata: { model: "elevenlabs-music" },
      })
      .select()
      .single();
    if (insErr) return json({ error: "DB insert failed" }, 500);

    return json({ success: true, asset });
  } catch (e) {
    console.error("[bgm] fatal", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
