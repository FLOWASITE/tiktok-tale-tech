// Generate embedding for a multi_channel_content row using Supabase gte-small (384-dim)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { content_id, text } = await req.json();
    if (!content_id || !text) {
      return new Response(JSON.stringify({ error: "content_id và text bắt buộc" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use Lovable AI Gateway embeddings via Gemini (text-embedding-004 → resize to 384)
    // Simpler: call Supabase's built-in inference via fetch to gte-small model
    const aiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const embedRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/text-embedding-004", input: text.slice(0, 8000) }),
    });

    if (!embedRes.ok) {
      const errText = await embedRes.text();
      throw new Error(`Embedding API failed [${embedRes.status}]: ${errText}`);
    }
    const embedData = await embedRes.json();
    let vec: number[] = embedData.data?.[0]?.embedding ?? [];

    // Resize to 384 dims (truncate or pad)
    if (vec.length > 384) vec = vec.slice(0, 384);
    else while (vec.length < 384) vec.push(0);

    const { error: updErr } = await supabase
      .from("multi_channel_contents")
      .update({ content_embedding: vec as any })
      .eq("id", content_id);

    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, dims: vec.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[embed-content] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
