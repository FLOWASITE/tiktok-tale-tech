import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAIConfig } from "../_shared/ai-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

const platformGuide = (platform: string) => {
  switch (platform) {
    case "tiktok":
      return 'TikTok — ưu tiên ngôn ngữ Gen Z, trend-driven, dùng "Follow để xem thêm". Hashtag 5-8 mix trending + niche + branded.';
    case "instagram":
      return 'Instagram — ưu tiên visual storytelling, aesthetic, dùng "Save & Share". Hashtag 5-10 mix trending + niche + branded + community.';
    case "linkedin":
      return "LinkedIn — ưu tiên professional insights, thought leadership, ngôn ngữ chuyên nghiệp. Hashtag 3-5 industry-specific.";
    default:
      return 'Facebook — ưu tiên storytelling, community, dùng "Save/Share bài viết". Hashtag 3-5 targeted.';
  }
};

function buildPrompt(carousel: any) {
  const slidesSummary = (carousel.slides_content || [])
    .map((s: any, i: number) => {
      const tc = typeof s.textContent === "string"
        ? s.textContent
        : [s.textContent?.headline, s.textContent?.subtitle, s.textContent?.caption, s.textContent?.dataValue, s.textContent?.dataLabel].filter(Boolean).join(" — ");
      return `Slide ${i + 1} (${s.objective || ""}): ${tc}`;
    })
    .join("\n");

  return `Bạn là chuyên gia copywriting social media. Hãy VIẾT LẠI Caption và CTA cho carousel sau (KHÁC với phiên bản trước, sáng tạo mới mẻ).

## THÔNG TIN CAROUSEL
- Tiêu đề: ${carousel.title}
- Chủ đề: ${carousel.topic}
- Brand: ${carousel.brand_name}
- Nền tảng: ${platformLabels[carousel.platform] || carousel.platform}

## NỘI DUNG SLIDES
${slidesSummary}

## NGUYÊN TẮC VIẾT CAPTION & CTA (CHUẨN MARKETING)

### CAPTION — Công thức HOOK-BODY-CTA-HASHTAG:
1. HOOK LINE (dòng đầu, <125 ký tự): gây TÒ MÒ/SHOCK — câu hỏi tranh cãi, số liệu sốc, statement ngược đời, "Đừng...", "Sai lầm...", "X% người không biết..."
2. BODY (2-4 dòng): mỗi dòng 1 ý, emoji đầu dòng (✅ 📌 💡 🔥 ⚡ 🎯), tóm tắt giá trị carousel.
3. CTA LINE: kêu gọi cụ thể (💾 Save / ↗️ Share / 💬 Comment) hoặc câu hỏi mở.
4. HASHTAGS: theo nền tảng — ${platformGuide(carousel.platform)}

### CTA SUGGESTION — Công thức đa tầng (3 dòng):
1. 🎯 CTA chính: Hành động trực tiếp ("💾 Save ngay để áp dụng khi cần!")
2. 💬 Engagement: Câu hỏi mở kéo comment ("Bạn đã thử tip nào rồi? Comment cho mình biết!")
3. 👥 Share: Lý do chia sẻ + tag ("Tag ngay người bạn đang cần biết điều này 👇")

QUAN TRỌNG: Caption và CTA PHẢI khác phiên bản cũ, sáng tạo, hấp dẫn hơn. Dùng \\n giữa các dòng.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carouselId } = await req.json();
    if (!carouselId) {
      return new Response(JSON.stringify({ error: "carouselId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Load carousel
    const { data: carousel, error: cErr } = await supabase
      .from("carousels")
      .select("*")
      .eq("id", carouselId)
      .single();

    if (cErr || !carousel) {
      return new Response(JSON.stringify({ error: "Carousel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace ownership
    if (carousel.organization_id) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", carousel.organization_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (carousel.user_id && carousel.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildPrompt(carousel);

    const aiConfig = await getAIConfig("regenerate-carousel-caption", carousel.organization_id);
    console.log(`[regenerate-carousel-caption] Using model: ${aiConfig.model}`);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.max_tokens,
        messages: [
          { role: "system", content: aiConfig.custom_system_prompt || "Bạn là chuyên gia copywriting social media chuyên viết caption và CTA viral." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "regenerate_caption_cta",
              description: "Trả về caption mới và CTA mới cho carousel",
              parameters: {
                type: "object",
                properties: {
                  captionSuggestion: {
                    type: "string",
                    description: "Caption mới theo công thức HOOK-BODY-CTA-HASHTAG, dùng \\n line breaks.",
                  },
                  ctaSuggestion: {
                    type: "string",
                    description: "CTA mới đa tầng (3 dòng: 🎯 CTA chính, 💬 Engagement, 👥 Share), dùng \\n line breaks.",
                  },
                },
                required: ["captionSuggestion", "ctaSuggestion"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "regenerate_caption_cta" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.", errorCode: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Đã hết credits AI. Vui lòng nâng cấp gói.", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { captionSuggestion: string; ctaSuggestion: string };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args:", e);
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update DB
    const { data: updated, error: uErr } = await supabase
      .from("carousels")
      .update({
        caption_suggestion: parsed.captionSuggestion,
        cta_suggestion: parsed.ctaSuggestion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", carouselId)
      .select()
      .single();

    if (uErr) {
      console.error("Update error:", uErr);
      return new Response(JSON.stringify({ error: "Failed to save" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        captionSuggestion: parsed.captionSuggestion,
        ctaSuggestion: parsed.ctaSuggestion,
        carousel: updated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("regenerate-carousel-caption error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
