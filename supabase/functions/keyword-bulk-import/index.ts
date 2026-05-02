// Bulk import keywords từ CSV (keyword,volume,kd,cpc,intent)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    // simple CSV parse (no quoted commas — đủ cho GSC export)
    const cells = line.split(",").map(c => c.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => obj[h] = cells[i] || "");
    return obj;
  });
}

function detectIntent(keyword: string): "informational" | "commercial" | "transactional" | "navigational" {
  const k = keyword.toLowerCase();
  if (/\b(mua|giá|đăng ký|dùng thử|báo giá|liên hệ|tải về|download|tải)\b/.test(k)) return "transactional";
  if (/\b(tốt nhất|so sánh|review|đánh giá|vs|miễn phí|free|tool|phần mềm|công cụ)\b/.test(k)) return "commercial";
  if (/\b(là gì|cách|làm sao|hướng dẫn|tutorial|tại sao|có nên)\b/.test(k)) return "informational";
  return "informational";
}

function detectFunnel(intent: string): "TOFU" | "MOFU" | "BOFU" {
  if (intent === "transactional") return "BOFU";
  if (intent === "commercial") return "MOFU";
  return "TOFU";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { csv, organizationId, locale = "vi", source = "csv_import" } = await req.json();
    if (!csv || !organizationId) {
      return new Response(JSON.stringify({ error: "csv & organizationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Empty CSV or invalid format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (rows.length > 5000) {
      return new Response(JSON.stringify({ error: "Max 5000 rows per import" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const records = rows.map(r => {
      const keyword = (r.keyword || r.query || r["từ khóa"] || "").toLowerCase().trim();
      if (!keyword) return null;
      const volume = parseInt(r.volume || r.search_volume || r.impressions || "0") || 0;
      const difficulty = parseInt(r.difficulty || r.kd || r["độ khó"] || "50") || 50;
      const cpc = parseFloat(r.cpc || r.cpc_vnd || "0") || 0;
      const intent = (r.intent as any) || detectIntent(keyword);
      return {
        organization_id: organizationId,
        keyword,
        locale,
        search_volume: volume,
        difficulty: Math.min(100, Math.max(0, difficulty)),
        cpc_vnd: cpc,
        intent,
        funnel_stage: detectFunnel(intent),
        source,
        status: "new" as const,
      };
    }).filter(Boolean);

    const { data: inserted, error } = await supabase.from("seo_keywords")
      .upsert(records as any, { onConflict: "organization_id,keyword,locale", ignoreDuplicates: false })
      .select("id");

    if (error) throw error;

    return new Response(JSON.stringify({ inserted: inserted?.length || 0, total_parsed: records.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[keyword-bulk-import] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
