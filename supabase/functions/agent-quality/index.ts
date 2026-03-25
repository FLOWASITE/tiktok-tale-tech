// ============================================
// Agent Quality — Standalone quality evaluation
// Evaluates content: GEO, Compliance, Persona-fit, Self-review
// Can be called directly or from agent-pipeline
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseJsonFromLLM(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  return null;
}

/** Fetch content text for scoring */
async function fetchContentText(
  supabase: any,
  contentId: string | null,
  contentType: string,
  pipelineState?: any,
): Promise<string> {
  if (contentId) {
    if (contentType === "multichannel" || contentType === "core_content") {
      const { data } = await supabase.from("core_contents").select("title, content").eq("id", contentId).single();
      if (data?.content) return `${data.title || ""}\n\n${data.content}`;
    }
    if (contentType === "video_script") {
      const { data } = await supabase.from("video_scripts").select("title, script_content").eq("id", contentId).single();
      if (data?.script_content) return `${data.title || ""}\n\n${typeof data.script_content === "string" ? data.script_content : JSON.stringify(data.script_content)}`;
    }
    if (contentType === "carousel") {
      const { data } = await supabase.from("carousels").select("title, slides_data").eq("id", contentId).single();
      if (data?.slides_data) {
        const slides = Array.isArray(data.slides_data) ? data.slides_data : [];
        const text = slides.map((s: any, i: number) => `Slide ${i + 1}: ${s.textContent || s.headline || JSON.stringify(s)}`).join("\n");
        return `${data.title || ""}\n\n${text}`;
      }
    }
  }
  // Fallback: pipeline state
  const createOutput = pipelineState?.stages?.create?.output;
  if (createOutput) {
    return createOutput.content || createOutput.article || createOutput.script || JSON.stringify(createOutput.slides || "").slice(0, 3000);
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const pipelineId = body.pipeline_id;
    const contentId = body.content_id;
    const contentType = body.content_type || "multichannel";
    const orgId = body.organization_id || body.organizationId;
    const brandTemplateId = body.brand_template_id || body.brandTemplateId;

    // ── Fallback: no content_id ──
    if (!contentId) {
      // Try to resolve from pipeline
      let resolvedContentId: string | null = null;
      let pState: any = null;

      if (pipelineId) {
        const { data: pipeline } = await supabase
          .from("agent_pipelines")
          .select("content_id, pipeline_state")
          .eq("id", pipelineId)
          .single();

        pState = pipeline?.pipeline_state || {};
        resolvedContentId = pipeline?.content_id
          || pState?.content_id
          || pState?.stages?.create?.output?.content_id
          || pState?.stages?.create?.output?.id
          || null;
      }

      if (!resolvedContentId) {
        return json({ status: "skipped", reason: "No content_id provided and could not resolve from pipeline" });
      }

      // Use resolved ID
      return await runQuality(supabase, supabaseUrl, supabaseKey, lovableApiKey, {
        pipelineId, contentId: resolvedContentId, contentType, orgId, brandTemplateId, pipelineState: pState,
      });
    }

    return await runQuality(supabase, supabaseUrl, supabaseKey, lovableApiKey, {
      pipelineId, contentId, contentType, orgId, brandTemplateId,
    });
  } catch (err) {
    console.error("[agent-quality] Error:", err);
    return json({ error: String(err) }, 500);
  }
});

interface QualityInput {
  pipelineId?: string;
  contentId: string;
  contentType: string;
  orgId: string;
  brandTemplateId?: string;
  pipelineState?: any;
}

async function runQuality(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  lovableApiKey: string | undefined,
  input: QualityInput,
) {
  const { pipelineId, contentId, contentType, orgId, brandTemplateId, pipelineState } = input;

  // ── 1. Fetch content text ──
  const contentText = await fetchContentText(supabase, contentId, contentType, pipelineState);
  if (!contentText || contentText.trim().length < 20) {
    return json({ status: "skipped", reason: "Content text too short or empty" });
  }

  console.log(`[agent-quality] Scoring content ${contentId}, type=${contentType}, text=${contentText.length} chars`);

  // ── 2. GEO Scoring ──
  let geoScores: any = null;
  try {
    const geoRes = await fetch(`${supabaseUrl}/functions/v1/geo-score-content`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contentText,
        contentId,
        contentType: contentType === "multichannel" ? "core_content" : contentType,
        organizationId: orgId,
      }),
    });
    const geoData = await geoRes.json();
    if (geoData && geoData.overall_score !== undefined) {
      geoScores = geoData;
    }
  } catch (e) {
    console.warn("[agent-quality] GEO scoring failed:", e);
  }

  // ── 3. Compliance Check via LLM ──
  let complianceResult: any = null;
  try {
    let brandData: any = null;
    let industryRules: string[] = [];
    let forbiddenTerms: string[] = [];

    if (brandTemplateId) {
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("brand_name, industry, tone_of_voice, forbidden_words, formality_level, industry_template_id")
        .eq("id", brandTemplateId)
        .single();
      brandData = brand;

      if (brand?.industry_template_id) {
        const { data: jurisdictions } = await supabase
          .from("industry_jurisdiction_profiles")
          .select("resolved_rules")
          .eq("industry_template_id", brand.industry_template_id)
          .limit(1);

        if (jurisdictions?.length > 0 && jurisdictions[0].resolved_rules) {
          const resolved = jurisdictions[0].resolved_rules;
          forbiddenTerms = [
            ...(resolved.terminology?.forbidden_terms || resolved.forbidden_terms || []),
            ...(resolved.terminology?.forbidden_words_local || []),
          ];
          const compRules = resolved.compliance_rules || resolved.claim_restrictions?.map((r: any) => r.claim) || [];
          industryRules = [
            ...forbiddenTerms.map((t: string) => `Từ cấm: "${t}"`),
            ...compRules.map((r: string) => `Quy định: ${r}`),
          ];
        }
      }
    }

    if (lovableApiKey && contentText) {
      const compliancePrompt = `Kiểm tra tuân thủ nội dung ${contentType} cho ngành "${brandData?.industry || "general"}".
Tiêu đề: ${contentId}
Nội dung (trích): ${contentText.slice(0, 4000)}
${brandData ? `Brand: ${brandData.brand_name}. Tone: ${brandData.tone_of_voice || "N/A"}. Từ cấm brand: ${(brandData.forbidden_words || []).join(", ") || "Không"}` : ""}
${industryRules.length > 0 ? `Quy định ngành:\n${industryRules.join("\n")}` : ""}

QUAN TRỌNG:
- Kiểm tra kỹ xem nội dung có chứa bất kỳ TỪ CẤM nào ở trên không (kể cả biến thể, đồng nghĩa)
- Đánh giá mức độ tuân thủ quy định ngành
- Nếu nội dung khuyến khích hành vi vi phạm pháp luật (trốn thuế, gian lận) → status PHẢI là "failed"
- Nếu có từ cấm hoặc claim quá mạnh → status "needs_review"
- Chỉ "passed" khi hoàn toàn sạch

Trả về JSON: { "status": "passed"|"needs_review"|"failed", "score": 0-100, "issues": [{"type":"forbidden_word"|"claim_violation"|"legal_risk"|"tone_mismatch","severity":"high"|"medium"|"low","description":"...","term":"..."}], "summary": "..." }`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Bạn là AI kiểm tra tuân thủ nội dung marketing. Luôn trả về JSON hợp lệ. Kiểm tra rất kỹ các từ cấm và quy định ngành." },
            { role: "user", content: compliancePrompt },
          ],
        }),
      });
      const aiData = await aiRes.json();
      complianceResult = parseJsonFromLLM(aiData?.choices?.[0]?.message?.content || "");
    }
  } catch (e) {
    console.warn("[agent-quality] Compliance check failed:", e);
  }

  // ── 4. Persona-Fit Scoring ──
  let personaFit: any = null;
  if (lovableApiKey && contentText && brandTemplateId) {
    try {
      const { data: personas } = await supabase
        .from("customer_personas")
        .select("name, occupation, age_range, pain_points, desires, buying_triggers, communication_style, objections")
        .eq("brand_template_id", brandTemplateId)
        .eq("is_primary", true)
        .limit(1);

      if (personas?.length) {
        const persona = personas[0];
        const personaPrompt = `Đánh giá mức độ phù hợp của nội dung sau với persona "${persona.name}" (${persona.occupation || ""}, ${persona.age_range || ""}).

NỘI DUNG (trích): ${contentText.slice(0, 2500)}

PERSONA:
- Pain points: ${JSON.stringify(persona.pain_points || [])}
- Desires: ${JSON.stringify(persona.desires || [])}
- Communication style: ${persona.communication_style || "N/A"}
- Objections: ${JSON.stringify(persona.objections || [])}
- Buying triggers: ${JSON.stringify(persona.buying_triggers || [])}

Chấm 5 chiều (0-100): pain_points (30%), desires (25%), communication_style (20%), objections (15%), triggers (10%).
Trả về JSON: { "pain_points": <number>, "desires": <number>, "communication_style": <number>, "objections": <number>, "triggers": <number>, "feedback": "<1 câu>" }`;

        const pfRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Đánh giá persona fit. Luôn trả JSON hợp lệ." },
              { role: "user", content: personaPrompt },
            ],
          }),
        });
        const pfData = await pfRes.json();
        const pfParsed = parseJsonFromLLM(pfData?.choices?.[0]?.message?.content || "");
        if (pfParsed) {
          const overall = Math.round(
            (pfParsed.pain_points || 50) * 0.30 +
            (pfParsed.desires || 50) * 0.25 +
            (pfParsed.communication_style || 50) * 0.20 +
            (pfParsed.objections || 50) * 0.15 +
            (pfParsed.triggers || 50) * 0.10,
          );
          personaFit = { ...pfParsed, overall, persona_name: persona.name };
        }
      }
    } catch (e) {
      console.warn("[agent-quality] Persona-fit check failed:", e);
    }
  }

  // ── 5. Self-review (from pipeline if available) ──
  let selfReview: any = null;
  if (pipelineId) {
    const { data: pipeline } = await supabase
      .from("agent_pipelines")
      .select("quality_scores, pipeline_state")
      .eq("id", pipelineId)
      .single();
    const pState = pipeline?.pipeline_state || {};
    selfReview = (pipeline?.quality_scores as any)?.self_review
      || pState?.stages?.create?.output?.self_review
      || null;
  }

  // ── 6. Merge all scores ──
  const geoOverall = geoScores?.overall_score ?? null;
  const compScore = complianceResult?.score ?? null;
  const selfReviewScore = selfReview?.overall ?? null;
  const personaFitScore = personaFit?.overall ?? null;

  // Weighted overall: GEO 30%, Compliance 25%, Self-review 25%, Persona-fit 20%
  const scoreParts: { score: number; weight: number }[] = [];
  if (geoOverall !== null) scoreParts.push({ score: geoOverall, weight: 0.30 });
  if (compScore !== null) scoreParts.push({ score: compScore, weight: 0.25 });
  if (selfReviewScore !== null) scoreParts.push({ score: selfReviewScore, weight: 0.25 });
  if (personaFitScore !== null) scoreParts.push({ score: personaFitScore, weight: 0.20 });

  let overallScore: number | null = null;
  if (scoreParts.length > 0) {
    const totalWeight = scoreParts.reduce((sum, p) => sum + p.weight, 0);
    overallScore = Math.round(scoreParts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight);
  }

  // Determine verdict
  const hasHighSeverityIssues = (complianceResult?.issues || []).some((i: any) => i.severity === "high");
  const complianceFailed = complianceResult?.status === "failed";
  const complianceWarning = complianceResult?.status === "needs_review";

  let verdict: "pass" | "needs_review" | "fail" = "pass";
  if (complianceFailed || (overallScore !== null && overallScore < 50)) {
    verdict = "fail";
  } else if (complianceWarning || hasHighSeverityIssues || (overallScore !== null && overallScore < 65)) {
    verdict = "needs_review";
  }

  const qualityScores = {
    geo: geoScores ? { overall_score: geoOverall, factor_scores: geoScores.factor_scores } : null,
    compliance: complianceResult || null,
    compliance_status: complianceResult?.status || null,
    compliance_score: compScore,
    compliance_issues: complianceResult?.issues || [],
    self_review: selfReview || null,
    persona_fit: personaFit || null,
    overall: overallScore,
    verdict,
    seo_score: geoScores?.seo_score ?? null,
    geo_scores: geoScores?.factor_scores ?? null,
  };

  // ── 7. Save to pipeline if pipeline_id provided ──
  if (pipelineId) {
    await supabase.from("agent_pipelines").update({
      quality_scores: qualityScores,
      overall_quality_score: overallScore,
    } as any).eq("id", pipelineId);

    // Flag if quality gate fails
    if (verdict === "fail") {
      await supabase.from("agent_pipelines").update({
        is_flagged: true,
        flag_reason: `Quality gate failed (score: ${overallScore}): ${complianceResult?.summary || "Low quality"}`,
      } as any).eq("id", pipelineId);
    } else if (verdict === "needs_review" && hasHighSeverityIssues) {
      await supabase.from("agent_pipelines").update({
        is_flagged: true,
        flag_reason: `Quality warning: ${complianceResult?.summary || "Needs review"}`,
      } as any).eq("id", pipelineId);
    }
  }

  console.log(`[agent-quality] Done. Overall: ${overallScore}, Verdict: ${verdict}, GEO: ${geoOverall}, Compliance: ${compScore}`);

  return json(qualityScores);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
