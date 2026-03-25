import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculatePieceCount(durationDays: number): { min: number; max: number } {
  if (durationDays <= 7) return { min: 3, max: 4 };
  if (durationDays <= 14) return { min: 5, max: 7 };
  if (durationDays <= 30) return { min: 8, max: 12 };
  return { min: 10, max: 15 };
}

function buildStrategyPrompt(params: {
  title: string;
  description: string;
  clarificationContext: Record<string, unknown> | null;
  brandName: string;
  industry: string;
  brandVoice: string;
  channels: string[];
  durationDays: number;
  startDate: string;
  pieceCount: { min: number; max: number };
  existingTitles: string[];
}): string {
  const clarificationStr = params.clarificationContext
    ? Object.entries(params.clarificationContext)
        .filter(([k]) => !['key_messages', 'primary_cta', 'pillar_allocation'].includes(k))
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "Không có thông tin bổ sung";

  // Extract brief fields from clarification context
  const ctx = params.clarificationContext || {};
  const keyMessages = Array.isArray(ctx.key_messages) ? ctx.key_messages as string[] : [];
  const primaryCta = typeof ctx.primary_cta === 'string' ? ctx.primary_cta : '';
  const pillarAllocation = (ctx.pillar_allocation && typeof ctx.pillar_allocation === 'object' && !Array.isArray(ctx.pillar_allocation))
    ? ctx.pillar_allocation as Record<string, number>
    : null;

  let briefSection = '';
  if (keyMessages.length > 0) {
    briefSection += `\nKEY MESSAGES (weave these into content naturally):\n${keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n`;
  }
  if (primaryCta) {
    briefSection += `\nPRIMARY CTA (use in harvest/conversion pieces): "${primaryCta}"\n`;
  }
  if (pillarAllocation) {
    const totalPieces = Math.round((params.pieceCount.min + params.pieceCount.max) / 2);
    const pillarLines = Object.entries(pillarAllocation)
      .map(([name, pct]) => `- ${name}: ${pct}% (~${Math.round(totalPieces * (pct as number) / 100)} pieces)`)
      .join("\n");
    briefSection += `\nCONTENT PILLAR DISTRIBUTION (MUST follow these percentages):\n${pillarLines}\nEach piece MUST have a "pillar" field matching one of these pillar names.\n`;
  }

  const dedupStr = params.existingTitles.length > 0
    ? `\n\nDEDUPLICATION — These topics ALREADY EXIST (do NOT suggest similar ones):\n${params.existingTitles.join("\n")}\nSuggest DIFFERENT angles.`
    : "";

  return `You are a content strategist. Create a content campaign plan based on:

Campaign: ${params.title}
Description: ${params.description || "Không có mô tả chi tiết"}
Target audience context:
${clarificationStr}
Brand: ${params.brandName} in ${params.industry}
Available channels: ${params.channels.join(", ")}
Duration: ${params.durationDays} days starting ${params.startDate}
Brand voice: ${params.brandVoice || "professional, friendly"}
${briefSection}
RULES:
1. Create ${params.pieceCount.min}-${params.pieceCount.max} content pieces spread across the campaign duration.

2. Each piece must have a DIFFERENT angle/hook — never repeat the same approach.
   Angle types: educational, comparison, case_study, behind_the_scenes,
   tips_tricks, myth_busting, testimonial, seasonal_hook, cta_offer, storytelling

3. Apply content role distribution:
   - Seed (attract attention): ~40% of pieces
   - Sprout (build engagement): ~35% of pieces
   - Harvest (convert): ~25% of pieces
   - Start campaign with Seed, end with Harvest

4. Choose content_type strategically for each piece:
   - "multichannel": For long-form educational content, articles, deep dives → best for LinkedIn, Facebook, Blog, Email
   - "video_script": For short video scripts (TikTok, Reels, YouTube Shorts) → best for TikTok, Instagram
   - "carousel": For visual carousel posts with multiple slides → best for Instagram, LinkedIn, Facebook
   Each campaign should have a MIX of content types. Aim for at least 2 different types.

5. Distribute across channels strategically:
   - Educational/long-form → multichannel → LinkedIn, Facebook, Website
   - Visual/short → carousel or video_script → Instagram, TikTok
   - Direct response → multichannel → Email, Zalo
   - Each channel should get at least 1 piece if selected

6. Schedule pieces with 2-3 day gaps minimum
   - Avoid weekends for B2B content
   - Tuesday-Thursday are best for LinkedIn
${pillarAllocation ? '\n7. PILLAR ALLOCATION is MANDATORY — distribute pieces according to the specified percentages above.\n   Every piece must be assigned to a pillar.\n' : ''}
7${pillarAllocation ? '' : ''}. ALL pieces must be directly related to: "${params.title}"
   Do NOT suggest unrelated trending topics.
${dedupStr}

Respond in the same language as the campaign title.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      goal_id,
      campaign_title,
      campaign_description,
      target_channels,
      campaign_duration_days,
      campaign_start_date,
      approval_mode,
      brand_template_id,
      clarification_context,
      organization_id,
    } = await req.json();

    if (!goal_id || !campaign_title || !organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: goal_id, campaign_title, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch brand context
    let brandName = "";
    let industry = "";
    let brandVoice = "";
    if (brand_template_id) {
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("brand_name, industry, tone_of_voice, brand_positioning")
        .eq("id", brand_template_id)
        .single();
      if (brand) {
        brandName = brand.brand_name || "";
        industry = brand.industry || "";
        brandVoice = [brand.tone_of_voice, brand.brand_positioning].filter(Boolean).join(". ");
      }
    }

    // Fetch existing titles for dedup
    let existingTitles: string[] = [];
    try {
      const { data: existingContent } = await supabase
        .from("multi_channel_contents")
        .select("title")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(30);
      const { data: recentPipelines } = await supabase
        .from("agent_pipelines")
        .select("content_title")
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false })
        .limit(15);
      existingTitles = [
        ...(existingContent || []).map((c: any) => c.title).filter(Boolean),
        ...(recentPipelines || []).map((p: any) => p.content_title).filter(Boolean),
      ].slice(0, 30);
    } catch { /* ignore dedup errors */ }

    const durationDays = campaign_duration_days || 14;
    const startDate = campaign_start_date || new Date().toISOString().split("T")[0];
    const channels = target_channels?.length ? target_channels : ["facebook"];
    const effectiveApprovalMode = approval_mode || "approve_plan";
    const pieceCount = calculatePieceCount(durationDays);

    const systemPrompt = buildStrategyPrompt({
      title: campaign_title,
      description: campaign_description || "",
      clarificationContext: clarification_context,
      brandName,
      industry,
      brandVoice,
      channels,
      durationDays,
      startDate,
      pieceCount,
      existingTitles,
    });

    // Call AI via tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a detailed content plan for the campaign "${campaign_title}". Return the plan using the generate_campaign_plan tool.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_campaign_plan",
              description: "Generate a structured content campaign plan",
              parameters: {
                type: "object",
                properties: {
                  plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        piece_number: { type: "number" },
                        title: { type: "string" },
                        angle: {
                          type: "string",
                          enum: [
                            "educational", "comparison", "case_study",
                            "behind_the_scenes", "tips_tricks", "myth_busting",
                            "testimonial", "seasonal_hook", "cta_offer", "storytelling",
                          ],
                        },
                        content_type: {
                          type: "string",
                          enum: ["multichannel", "video_script", "carousel"],
                          description: "Type of content to generate. multichannel=article/post, video_script=short video, carousel=multi-slide visual",
                        },
                        target_channel: { type: "string" },
                        content_role: { type: "string", enum: ["seed", "sprout", "harvest"] },
                        format: { type: "string", enum: ["post", "carousel", "video_script", "email"] },
                        scheduled_date: { type: "string", description: "YYYY-MM-DD" },
                        key_message: { type: "string" },
                        estimated_length: { type: "string", enum: ["short", "medium", "long"] },
                      },
                      required: [
                        "piece_number", "title", "angle", "content_type", "target_channel",
                        "content_role", "format", "scheduled_date", "key_message",
                      ],
                    },
                  },
                  strategy_summary: { type: "string" },
                  content_mix: {
                    type: "object",
                    properties: {
                      seed: { type: "number" },
                      sprout: { type: "number" },
                      harvest: { type: "number" },
                    },
                    required: ["seed", "sprout", "harvest"],
                  },
                },
                required: ["plan", "strategy_summary", "content_mix"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_campaign_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Vui lòng thử lại sau.", errorCode: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiResult = await aiResponse.json();

    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured plan data");
    }

    let planData: { plan: any[]; strategy_summary: string; content_mix: Record<string, number> };
    try {
      planData = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI strategy output");
    }

    // Add default statuses, ensure content_type, and pipeline_id to each piece
    const pieces = planData.plan.map((piece: any, idx: number) => ({
      ...piece,
      piece_number: idx + 1,
      content_type: piece.content_type || (piece.format === "video_script" ? "video_script" : piece.format === "carousel" ? "carousel" : "multichannel"),
      pipeline_id: null,
      status: "planned",
      estimated_length: piece.estimated_length || "medium",
    }));

    // Calculate campaign end date
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const campaignEndDate = endDate.toISOString().split("T")[0];

    // Insert into campaign_content_plans
    const { data: plan, error: planError } = await supabase
      .from("campaign_content_plans")
      .insert({
        goal_id,
        organization_id,
        plan_data: pieces,
        total_pieces: pieces.length,
        completed_pieces: 0,
        campaign_start_date: startDate,
        campaign_end_date: campaignEndDate,
        campaign_duration_days: durationDays,
        approval_mode: effectiveApprovalMode,
        clarification_context,
        strategy_summary: planData.strategy_summary || null,
        status: effectiveApprovalMode === "full_auto" ? "approved" : "planned",
        plan_approved: effectiveApprovalMode === "full_auto",
        plan_approved_at: effectiveApprovalMode === "full_auto" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (planError) throw new Error(`Failed to save plan: ${planError.message}`);

    // If full_auto, create pipelines immediately via create_from_plan action
    let pipelinesCreated = 0;
    if (effectiveApprovalMode === "full_auto" && plan) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const res = await fetch(`${supabaseUrl}/functions/v1/agent-pipeline`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_from_plan", plan_id: plan.id }),
        });
        const result = await res.json().catch(() => ({}));
        pipelinesCreated = result.pipeline_count || 0;
      } catch (e) {
        console.error("Failed to auto-create pipelines:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan_id: plan.id,
        plan: pieces,
        strategy_summary: planData.strategy_summary,
        content_mix: planData.content_mix,
        total_pieces: pieces.length,
        pipelines_created: pipelinesCreated,
        approval_mode: effectiveApprovalMode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-campaign-strategy error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
