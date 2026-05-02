// supabase/functions/generate-seo-landing/index.ts
// AI-powered generator for SEO landing pages.
// Admin-only. Uses Lovable AI Gateway (Gemini 2.5 Flash) for cost-efficient bulk generation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateRequest {
  page_type: "industry" | "comparison" | "use_case" | "feature" | "tool";
  topic: string; // e.g. "spa thẩm mỹ" / "Jasper AI" / "viết quảng cáo Facebook"
  slug?: string; // optional; auto-derived if omitted
  competitor_name?: string;
  feature_key?: string;
  industry_id?: string;
  publish?: boolean; // default false (draft)
}

const SYSTEM_PROMPTS: Record<string, string> = {
  industry: `Bạn là chuyên gia SEO content viết landing page tiếng Việt cho Flowa — nền tảng AI Marketing Agent. Trả về JSON đúng schema dưới đây (KHÔNG markdown). Tone chuyên nghiệp, gần gũi, có số liệu cụ thể, FAQ phải trả lời trực tiếp như AI engine answer block.`,
  comparison: `Bạn là chuyên gia SEO so sánh sản phẩm SaaS tiếng Việt cho Flowa. So sánh khách quan, công bằng, KHÔNG bôi nhọ đối thủ. Trả về JSON đúng schema. Comparison table phải có 8-12 features.`,
  use_case: `Bạn viết landing page use-case tiếng Việt cho Flowa. Tập trung vào pain points cụ thể và cách Flowa giải quyết. Trả về JSON đúng schema.`,
  feature: `Bạn viết landing page tính năng tiếng Việt cho Flowa. Demo concrete, có ví dụ thực tế. Trả về JSON đúng schema.`,
  tool: `Bạn viết landing page free-tool tiếng Việt cho Flowa. Hook người dùng dùng thử ngay, CTA upgrade rõ ràng. Trả về JSON đúng schema.`,
};

const OUTPUT_SCHEMA = `{
  "title": "string ≤60 chars, có keyword chính",
  "meta_description": "string ≤155 chars, có CTA + keyword",
  "h1": "string ≤70 chars, hấp dẫn click",
  "keywords": ["3-5 keyword tiếng Việt"],
  "intro_html": "<p>...</p> 80-120 từ, định nghĩa + value prop",
  "tldr": { "bullets": ["3-5 bullet ngắn ≤25 từ mỗi bullet"] },
  "key_stats": [
    { "label": "...", "value": "85%", "source": "Flowa internal data 2026" }
  ],
  "sections": [
    { "heading": "string", "body_html": "<p>...</p><ul>...</ul> 200-400 từ" }
  ],
  "comparison_table": null OR { "headers": ["Tính năng","Flowa","Đối thủ"], "rows": [{"feature":"...","values":["...",true,false]}] },
  "faqs": [{"question":"...","answer":"<p>...</p> trả lời đầy đủ 50-100 từ"}]
}`;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate JWT and admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as GenerateRequest;
    if (!body.page_type || !body.topic) {
      return new Response(JSON.stringify({ error: "page_type and topic are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalSlug = body.slug || slugify(
      body.page_type === "comparison"
        ? `flowa-vs-${body.topic}`
        : body.topic,
    );

    const systemPrompt = SYSTEM_PROMPTS[body.page_type] || SYSTEM_PROMPTS.industry;
    const userPrompt = `Tạo SEO landing page cho:
- Loại: ${body.page_type}
- Chủ đề: ${body.topic}
${body.competitor_name ? `- Đối thủ so sánh: ${body.competitor_name}` : ""}
${body.feature_key ? `- Tính năng: ${body.feature_key}` : ""}

Trả về CHỈ JSON đúng schema:
${OUTPUT_SCHEMA}`;

    // Call Lovable AI Gateway (Gemini 2.5 Flash — fast & cheap for bulk gen)
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[generate-seo-landing] AI error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: `AI gateway error ${aiRes.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "AI returned empty content" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to parse AI JSON", raw: content }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insertRow = {
      slug: finalSlug,
      page_type: body.page_type,
      locale: "vi",
      title: parsed.title || body.topic,
      meta_description: parsed.meta_description || "",
      h1: parsed.h1 || body.topic,
      keywords: parsed.keywords || null,
      intro_html: parsed.intro_html || null,
      tldr: parsed.tldr || null,
      sections: parsed.sections || [],
      faqs: parsed.faqs || [],
      key_stats: parsed.key_stats || [],
      comparison_table: parsed.comparison_table || null,
      competitor_name: body.competitor_name || null,
      feature_key: body.feature_key || null,
      industry_id: body.industry_id || null,
      is_published: !!body.publish,
      published_at: body.publish ? new Date().toISOString() : null,
      ai_generated: true,
      generation_prompt_version: "v1.0",
      created_by: userRes.user.id,
    };

    const { data: saved, error: insertErr } = await supabase
      .from("seo_landing_pages")
      .upsert(insertRow, { onConflict: "slug" })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, page: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-seo-landing] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
