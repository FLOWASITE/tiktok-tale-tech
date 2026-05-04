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
    let sourceClusterId: string | null = null;

    if (content_id) {
      const { data: src } = await supabase
        .from("multi_channel_contents")
        .select("content_embedding, title, topic, website_content, blogger_content, wordpress_content, cluster_id")
        .eq("id", content_id).maybeSingle();
      sourceClusterId = (src as any)?.cluster_id ?? null;
      if (src?.content_embedding) {
        queryEmbedding = src.content_embedding as any;
      } else if (src) {
        const txt = [src.title, src.topic, (src as any).website_content, (src as any).blogger_content, (src as any).wordpress_content]
          .filter((x: any) => typeof x === "string" && x.trim().length > 0).join("\n\n").slice(0, 8000);
        if (txt.length >= 50) {
          queryEmbedding = await embed(txt);
          // Persist for future calls
          try {
            await supabase.from("multi_channel_contents")
              .update({ content_embedding: queryEmbedding as any })
              .eq("id", content_id);
          } catch (e) { console.warn("[suggest-internal-links] persist embedding failed", e); }
        }
      }
    } else if (query_text) {
      queryEmbedding = await embed(query_text);
    }

    if (!queryEmbedding) {
      return new Response(JSON.stringify({ suggestions: [], note: "Không có embedding nguồn", fallback: true }), {
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

    // Fetch cluster_id + URL công khai cho related items
    const ids = (related ?? []).map((r: any) => r.id);
    type Meta = { cluster_id: string | null; url: string | null };
    let metaMap: Record<string, Meta> = {};
    if (ids.length) {
      const { data: rows } = await supabase
        .from("multi_channel_contents")
        .select("id, cluster_id, website_post_url, blogger_post_url, wordpress_post_url, flowa_blog_post_url")
        .in("id", ids);
      metaMap = Object.fromEntries((rows ?? []).map((r: any) => [r.id, {
        cluster_id: r.cluster_id ?? null,
        url:
          r.website_post_url ||
          r.blogger_post_url ||
          r.wordpress_post_url ||
          r.flowa_blog_post_url ||
          null,
      }]));
    }

    const suggestions = (related ?? [])
      .map((r: any) => {
        const meta = metaMap[r.id] ?? { cluster_id: null, url: null };
        const sameCluster = !!sourceClusterId && meta.cluster_id === sourceClusterId;
        const baseSim = Number(r.similarity);
        const boosted = sameCluster ? Math.min(1, baseSim + 0.1) : baseSim;
        return {
          id: r.id,
          title: r.title,
          topic: r.topic,
          similarity: boosted.toFixed(3),
          same_cluster: sameCluster,
          anchor_suggestion: r.title,
          url: meta.url,            // URL công khai thực tế (null nếu chưa publish)
          url_hint: meta.url,       // alias cho UI cũ
          published: !!meta.url,
        };
      })
      // Loại bài chưa publish (không có URL công khai để chèn)
      .filter((s: any) => !!s.url)
      .sort((a: any, b: any) => Number(b.similarity) - Number(a.similarity));

    return new Response(JSON.stringify({ suggestions, source_cluster_id: sourceClusterId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[suggest-internal-links] Error:", error);
    // Graceful fallback — never crash the viewer
    return new Response(
      JSON.stringify({ suggestions: [], error: error?.message || "unknown", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// deno-lint-ignore no-explicit-any
declare const Supabase: any;
let _embedSession: any = null;
function getEmbedSession() {
  if (!_embedSession) _embedSession = new Supabase.ai.Session("gte-small");
  return _embedSession;
}

async function embed(text: string): Promise<number[]> {
  // Primary: Supabase built-in gte-small (384-dim, no external API)
  try {
    const out = await getEmbedSession().run(text.slice(0, 8000), { mean_pool: true, normalize: true });
    let vec = Array.from(out as Float32Array) as number[];
    if (vec.length > 384) vec = vec.slice(0, 384);
    else while (vec.length < 384) vec.push(0);
    return vec;
  } catch (e) {
    console.warn("[suggest-internal-links] Supabase.ai embed failed, fallback to gateway:", e);
  }
  // Fallback: Lovable AI gateway
  const aiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/text-embedding-004", input: text.slice(0, 8000) }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Embed failed: ${res.status} ${errBody.slice(0, 200)}`);
  }
  const j = await res.json();
  let vec: number[] = j.data?.[0]?.embedding ?? [];
  if (vec.length > 384) vec = vec.slice(0, 384);
  else while (vec.length < 384) vec.push(0);
  return vec;
}
