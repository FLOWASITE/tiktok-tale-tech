// Suggest internal links for a piece of content using vector similarity
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content_id, query_text, organization_id, match_count = 5, threshold = 0.65 } = await req.json();
    if (!organization_id || (!content_id && !query_text)) {
      return new Response(JSON.stringify({ error: "Cần organization_id và (content_id hoặc query_text)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user belongs to org
    const userRes = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const userId = userRes.data.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: member } = await supabase
      .from("organization_members")
      .select("id").eq("user_id", userId).eq("organization_id", organization_id).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Không thuộc workspace này" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get query embedding: either fetch from existing content or generate from query_text
    let queryEmbedding: number[] | null = null;
    let excludeId: string | null = content_id ?? null;

    if (content_id) {
      const { data: src } = await supabase
        .from("multi_channel_contents")
        .select("content_embedding, title, topic, website_content")
        .eq("id", content_id).maybeSingle();
      if (src?.content_embedding) {
        queryEmbedding = src.content_embedding as any;
      } else if (src) {
        // Generate on the fly
        const txt = [src.title, src.topic, (src.website_content || "").slice(0, 2000)].filter(Boolean).join("\n");
        queryEmbedding = await embed(txt);
      }
    } else if (query_text) {
      queryEmbedding = await embed(query_text);
    }

    if (!queryEmbedding) {
      return new Response(JSON.stringify({ suggestions: [], note: "Không có embedding nguồn" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: related, error } = await supabase.rpc("find_related_content", {
      query_embedding: queryEmbedding as any,
      org_id: organization_id,
      exclude_id: excludeId,
      match_count,
      similarity_threshold: threshold,
    });
    if (error) throw error;

    const suggestions = (related ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      topic: r.topic,
      similarity: Number(r.similarity).toFixed(3),
      anchor_suggestion: r.title,
      url_hint: `/blog/${r.id}`,
    }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[suggest-internal-links] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function embed(text: string): Promise<number[]> {
  const aiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/text-embedding-004", input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status}`);
  const j = await res.json();
  let vec: number[] = j.data?.[0]?.embedding ?? [];
  if (vec.length > 384) vec = vec.slice(0, 384);
  else while (vec.length < 384) vec.push(0);
  return vec;
}
