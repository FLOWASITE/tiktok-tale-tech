import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orgId: string | undefined = body?.orgId;
    const targetClusterId: string | undefined = body?.clusterId;
    const limit: number = Math.min(Math.max(parseInt(body?.limit ?? "50"), 1), 100);

    if (!orgId) return json({ error: "Missing orgId" }, 400);

    // Verify org membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    // Fetch active clusters
    const { data: allClusters = [] } = await supabase
      .from("seo_clusters")
      .select("id, name, description, status")
      .eq("organization_id", orgId)
      .in("status", ["planning", "active"]);

    const clusters = (allClusters || []) as Array<{ id: string; name: string; description: string | null; status: string }>;
    if (clusters.length === 0) return json({ assignments: [], message: "Chưa có pillar nào để gom" });

    // Sample keywords per cluster (for AI context)
    const clusterIds = clusters.map((c) => c.id);
    const { data: sampleKws = [] } = await supabase
      .from("seo_keywords")
      .select("id, keyword, cluster_id")
      .in("cluster_id", clusterIds)
      .order("priority_score", { ascending: false })
      .limit(200);

    const samplesByCluster: Record<string, string[]> = {};
    for (const k of sampleKws as any[]) {
      const cid = k.cluster_id as string;
      (samplesByCluster[cid] ||= []).push(k.keyword);
    }

    // Fetch orphans
    const { data: orphans = [] } = await supabase
      .from("seo_keywords")
      .select("id, keyword, intent, search_volume, priority_score")
      .eq("organization_id", orgId)
      .is("cluster_id", null)
      .order("priority_score", { ascending: false })
      .limit(limit);

    if (!orphans || orphans.length === 0) {
      return json({ assignments: [], message: "Không có orphan keyword" });
    }

    const clusterBlock = clusters
      .map((c, i) => {
        const samples = (samplesByCluster[c.id] || []).slice(0, 8).join(", ");
        return `${i + 1}. id=${c.id} | "${c.name}"${c.description ? ` — ${c.description}` : ""}${samples ? `\n   Sample keywords: ${samples}` : ""}`;
      })
      .join("\n");

    const orphanBlock = (orphans as any[])
      .map((k, i) => `${i + 1}. id=${k.id} | "${k.keyword}" | intent=${k.intent || "n/a"} | vol=${k.search_volume ?? "?"}`)
      .join("\n");

    const targetHint = targetClusterId
      ? `\nƯU TIÊN gắn vào pillar có id=${targetClusterId} nếu phù hợp về mặt ngữ nghĩa.`
      : "";

    const prompt = `Bạn là SEO strategist. Cho danh sách Pillar và danh sách orphan keyword, gắn mỗi orphan vào MỘT pillar phù hợp nhất, hoặc bỏ qua nếu không pillar nào liên quan.

PILLARS:
${clusterBlock}

ORPHAN KEYWORDS:
${orphanBlock}
${targetHint}

YÊU CẦU:
- Chỉ gắn orphan khi confidence ≥ 0.6 (semantic + topic phù hợp).
- Không tự bịa pillar mới — chỉ chọn từ list trên.
- Không gắn nếu keyword quá generic / không liên quan rõ ràng → bỏ qua (không trả về).

Trả về CHÍNH XÁC JSON:
{
  "assignments": [
    { "keyword_id": "uuid", "cluster_id": "uuid", "confidence": 0.0-1.0, "reason": "1 câu ngắn" }
  ]
}`;

    const aiResult = await callAI({
      functionName: "seo-auto-cluster-orphans",
      organizationId: orgId,
      messages: [
        { role: "system", content: "Bạn là SEO strategist. Luôn trả lời JSON hợp lệ." },
        { role: "user", content: prompt },
      ],
    } as any);

    const text = aiResult?.data?.choices?.[0]?.message?.content
      || (aiResult as any)?.content
      || aiResult?.data?.content
      || "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { assignments: [] };
    }

    const validClusters = new Set(clusterIds);
    const validKeywords = new Set((orphans as any[]).map((k) => k.id));
    const kwMap = new Map((orphans as any[]).map((k) => [k.id, k.keyword]));
    const clusterNameMap = new Map(clusters.map((c) => [c.id, c.name]));

    const assignments = (parsed.assignments || [])
      .filter((a: any) =>
        a && validKeywords.has(a.keyword_id) && validClusters.has(a.cluster_id) && (a.confidence ?? 0) >= 0.5
      )
      .map((a: any) => ({
        keyword_id: a.keyword_id,
        keyword: kwMap.get(a.keyword_id),
        cluster_id: a.cluster_id,
        cluster_name: clusterNameMap.get(a.cluster_id),
        confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0)),
        reason: String(a.reason || "").slice(0, 200),
      }));

    return json({ assignments, totalOrphans: orphans.length });
  } catch (error: any) {
    console.error("[seo-auto-cluster-orphans] Error:", error);
    return json({ error: error.message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
