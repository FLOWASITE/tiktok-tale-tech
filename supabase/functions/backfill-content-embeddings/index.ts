// Backfill content_embedding cho multi_channel_contents (admin-only)
// Gọi lặp với cùng organization_id để xử lý từng batch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callEmbedding } from "../_shared/embedding.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
declare const Supabase: any;
let _session: any = null;
function getSession() {
  if (!_session) _session = new Supabase.ai.Session("gte-small");
  return _session;
}

async function embed(text: string): Promise<number[]> {
  try {
    const out = await getSession().run(text.slice(0, 8000), { mean_pool: true, normalize: true });
    let vec = Array.from(out as Float32Array) as number[];
    if (vec.length > 384) vec = vec.slice(0, 384);
    while (vec.length < 384) vec.push(0);
    return vec;
  } catch (e) {
    console.warn("[backfill-embeddings] Supabase.ai failed, fallback gateway:", e);
    const vec = await callEmbedding(text.slice(0, 8000));
    return vec;
  }
}

function buildText(row: any): string {
  const parts = [
    row.title,
    row.topic,
    row.website_content,
    row.blogger_content,
    row.wordpress_content,
  ].filter((x: any) => typeof x === "string" && x.trim().length > 0);
  return parts.join("\n\n").slice(0, 8000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userRes = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userRes.data.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const organizationId: string | undefined = body.organization_id;
    const batchSize: number = Math.min(Math.max(1, body.batch_size ?? 20), 50);

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Không thuộc workspace" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Chỉ xử lý bài đã có ít nhất 1 URL công khai (publish ra website/blogger/wordpress/flowa blog)
    // → embed mới có ý nghĩa cho gợi ý liên kết nội bộ.
    const PUBLISHED_FILTER =
      "website_post_url.not.is.null,blogger_post_url.not.is.null,wordpress_post_url.not.is.null,flowa_blog_post_url.not.is.null";

    // Count remaining
    const { count: remainingBefore } = await supabase
      .from("multi_channel_contents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("content_embedding", null)
      .or(PUBLISHED_FILTER);

    const { data: rows, error: selErr } = await supabase
      .from("multi_channel_contents")
      .select("id, title, topic, website_content, blogger_content, wordpress_content")
      .eq("organization_id", organizationId)
      .is("content_embedding", null)
      .or(PUBLISHED_FILTER)
      .order("created_at", { ascending: false })
      .limit(batchSize);
    if (selErr) throw selErr;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows ?? []) {
      const text = buildText(row);
      if (!text || text.length < 50) {
        skipped++;
        continue;
      }
      try {
        const vec = await embed(text);
        const { error: updErr } = await supabase
          .from("multi_channel_contents")
          .update({ content_embedding: vec as any })
          .eq("id", row.id);
        if (updErr) throw updErr;
        processed++;
      } catch (e: any) {
        errors.push(`${row.id}: ${e?.message || "unknown"}`);
      }
    }

    const remaining = Math.max(0, (remainingBefore ?? 0) - processed);

    return new Response(JSON.stringify({
      success: true,
      processed,
      skipped,
      remaining,
      batch_size: rows?.length ?? 0,
      errors: errors.slice(0, 5),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[backfill-content-embeddings] Error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
