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

    const { title, description, industry, channels, brand_name } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: "title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const channelList = (channels || []).join(", ") || "chưa chọn";

    const prompt = `You are a content strategist. A user wants to create a content campaign.

Campaign title: "${title}"
Campaign description: "${description || "not provided"}"
Brand name: "${brand_name || "not provided"}"
Brand industry: "${industry || "not provided"}"
Target channels: ${channelList}

Evaluate if you have enough information to create high-quality, targeted content.
Consider:
1. Is the topic specific enough? (not just a vague title)
2. Can you infer the target audience?
3. Is the goal/CTA clear or inferable?
4. Are there key details missing that would significantly improve content quality?

If you can confidently create great content, respond with ONLY this JSON:
{ "ready": true, "understanding": "brief summary in same language as campaign title" }

If you need more info, respond with ONLY this JSON:
{ "ready": false, "questions": [
  { "question": "question text", "why": "reason", "suggestions": ["option1", "option2", "option3"] }
]}

Rules:
- Ask maximum 3 questions
- Each question must have exactly 3 suggested answers
- Respond in the SAME LANGUAGE as the campaign title
- Return ONLY valid JSON, no markdown`;

    // Call AI via Lovable gateway
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
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("[clarify-campaign-intent] AI error:", aiRes.status, errText);
      // Fallback: just say ready if AI unavailable
      return new Response(
        JSON.stringify({ ready: true, understanding: `Tạo nội dung về "${title}"` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed: any;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown
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
