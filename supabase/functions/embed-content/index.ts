// Generate embedding for a multi_channel_content row (384-dim)
// Refactored: dùng _shared/embedding.ts → tự động chọn OpenAI/DashScope khi self-host
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callEmbedding } from "../_shared/embedding.ts";

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

    const { embedding, provider, model, dims } = await callEmbedding({ text, dims: 384 });

    const { error: updErr } = await supabase
      .from("multi_channel_contents")
      .update({ content_embedding: embedding as any })
      .eq("id", content_id);

    if (updErr) throw updErr;

    console.log(`[embed-content] OK provider=${provider} model=${model} dims=${dims}`);
    return new Response(JSON.stringify({ success: true, dims, provider, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[embed-content] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
