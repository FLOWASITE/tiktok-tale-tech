import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const title = body.title || body.campaign_title;
    const description = body.description || body.campaign_description || "";
    const channels = body.channels || body.target_channels || [];
    const brandTemplateId = body.brand_template_id;
    const organizationId = body.organization_id;
    let brandName = body.brand_name || "";
    let industry = body.industry || "";

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch brand context if brand_template_id provided
    if (brandTemplateId && (!brandName || !industry)) {
      try {
        const { data: brand } = await supabase
          .from("brand_templates")
          .select("brand_name, industry, tone_of_voice")
          .eq("id", brandTemplateId)
          .single();
        if (brand) {
          brandName = brandName || brand.brand_name || "";
          industry = industry || brand.industry || "";
        }
      } catch { /* ignore */ }
    }

    const channelList = (Array.isArray(channels) ? channels : []).join(", ") || "chưa chọn";

    // Calculate brief completeness score
    const hasDetailedTitle = title.length > 30;
    const hasDescription = description.length > 20;
    const hasChannels = channels.length > 0;
    const hasBrand = !!brandName;
    const completenessScore = [hasDetailedTitle, hasDescription, hasChannels, hasBrand].filter(Boolean).length;

    const prompt = `You are a content strategist. A user wants to create a content campaign.

Campaign title: "${title}"
Campaign description: "${description || "not provided"}"
Brand name: "${brandName || "not provided"}"
Brand industry: "${industry || "not provided"}"
Target channels: ${channelList}

Brief completeness: ${completenessScore}/4 criteria met.

Evaluate if you have enough information to create high-quality, targeted content.
Consider:
1. Is the topic specific enough? (not just a single word or vague phrase)
2. Can you infer the target audience from the title + description?
3. Is the goal/CTA clear or inferable from the context?
4. Are there key details missing that would significantly improve content quality?

IMPORTANT: If the title AND description together provide enough context to understand:
- WHAT to promote/discuss
- WHO the target audience is (or can be reasonably inferred)
- WHAT the goal is (attract, educate, sell, etc.)
Then respond with ready: true. Don't ask unnecessary questions when the brief is already actionable.

If ready, respond with ONLY this JSON:
{ "ready": true, "understanding": "brief summary of what you'll create, in same language as campaign title" }

If you genuinely need more info (e.g., title is just one word, no description, no clear direction), respond with ONLY this JSON:
{ "ready": false, "questions": [
  { "question": "question text", "why": "reason", "suggestions": ["option1", "option2", "option3"] }
]}

Rules:
- Ask maximum 3 questions
- Each question must have exactly 3 suggested answers
- Respond in the SAME LANGUAGE as the campaign title
- Return ONLY valid JSON, no markdown`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(lovableApiKey ? { "Authorization": `Bearer ${lovableApiKey}` } : {}),
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[clarify-campaign-intent] AI error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ ready: true, understanding: `Tạo nội dung về "${title}"` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { ready: true, understanding: `Tạo nội dung về "${title}"` };
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[clarify-campaign-intent] Error:", e);
    return new Response(
      JSON.stringify({ ready: true, understanding: "Đủ thông tin để bắt đầu" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
