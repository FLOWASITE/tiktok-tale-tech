import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function tokenize(s: string): Set<string> {
  return new Set(
    (s || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

Deno.serve(withPerf({ functionName: "suggest-internal-links" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) throw new Error("Unauthorized");
    const userId = claims.claims.sub;

    const { organizationId, draftText, domain, mode = "internal", limit = 5 } = await req.json();
    if (!organizationId || !draftText) throw new Error("organizationId & draftText required");

    const { data: mem } = await supabase
      .from("organization_members")
      .select("organization_id").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
    if (!mem) throw new Error("Forbidden");

    let q = supabase
      .from("external_link_sources")
      .select("url, title, domain, excerpt, keywords")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .limit(300);
    if (mode === "internal" && domain) q = q.eq("domain", domain);
    if (mode === "backlink" && domain) q = q.neq("domain", domain);

    const { data: pool, error } = await q;
    if (error) throw error;
    if (!pool?.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const draftTokens = tokenize(draftText.slice(0, 4000));
    const scored = pool.map((p) => {
      const itemTokens = tokenize(`${p.title || ""} ${(p.keywords || []).join(" ")} ${p.excerpt || ""}`);
      return { ...p, score: jaccard(draftTokens, itemTokens) };
    }).filter((p) => p.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Suggest anchor: use existing title; (could call LLM later for nicer anchors)
    const suggestions = scored.map((s) => ({
      url: s.url,
      title: s.title,
      domain: s.domain,
      score: Math.round(s.score * 1000) / 1000,
      suggestedAnchor: s.title || s.url,
    }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[suggest-internal-links] error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
