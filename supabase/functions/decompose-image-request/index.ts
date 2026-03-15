import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Post-processing: validate and fix overlay fields */
function validateOverlay(overlay: any, primaryColor: string): any {
  const result = { ...overlay };

  // Banner: ensure non-empty, ≤ 30 chars
  if (result.banner) {
    if (!result.banner.text || result.banner.text.trim().length === 0) {
      delete result.banner;
    } else {
      result.banner.text = result.banner.text.trim().slice(0, 30);
      result.banner.bgColor = primaryColor;
      result.banner.position = result.banner.position || "top";
    }
  }

  // Hero text: ensure non-empty, ≤ 20 chars
  if (result.heroText) {
    if (!result.heroText.text || result.heroText.text.trim().length === 0) {
      delete result.heroText;
    } else {
      result.heroText.text = result.heroText.text.trim().slice(0, 20);
      result.heroText.fontSize = result.heroText.fontSize || "3xl";
      result.heroText.effect = result.heroText.effect || "gradient";
    }
  }

  // Headline: trim
  if (result.headline) {
    result.headline = result.headline.trim();
    if (result.headline.length === 0) delete result.headline;
  }

  // Cards: ensure at least 2 items, each ≤ 50 chars
  if (result.cards) {
    if (!result.cards.items || !Array.isArray(result.cards.items)) {
      delete result.cards;
    } else {
      result.cards.items = result.cards.items
        .filter((c: any) => c.label && c.label.trim().length > 0)
        .map((c: any) => ({ ...c, label: c.label.trim().slice(0, 50) }));

      if (result.cards.items.length < 2) {
        delete result.cards;
      } else {
        const count = result.cards.items.length;
        result.cards.layout = result.cards.layout || (count <= 2 ? "horizontal" : count <= 4 ? "grid-2x2" : "vertical");
      }
    }
  }

  // CTA: trim
  if (result.cta) {
    result.cta = result.cta.trim();
    if (result.cta.length === 0) delete result.cta;
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, primaryColor = "#DC2626", secondaryColor = "#FFFFFF" } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "Missing description" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Bạn là chuyên gia thiết kế infographic. Nhiệm vụ: từ mô tả nội dung (có thể là narrative, blog, hoặc tóm tắt), bạn phải SÁNG TẠO nội dung infographic có ý nghĩa gồm 2 phần:

1. **backgroundPrompt**: Mô tả hình ảnh nền (visual, atmosphere, illustration). KHÔNG bao gồm text, số, UI.

2. **overlayConfig**: SÁNG TẠO các thành phần text overlay có ý nghĩa từ nội dung:
   - **banner**: Nhãn ngắn gọn 2-4 từ IN HOA tóm tắt chủ đề (VD: "CHÍNH SÁCH MỚI", "CẬP NHẬT THUẾ", "TIN NÓNG", "KIẾN THỨC HAY")
   - **heroText**: Số liệu nổi bật hoặc keyword mạnh ≤ 20 ký tự (VD: "100%", "50 TRIỆU", "GIẢM 30%", "TOP 5")
   - **headline**: Tiêu đề chính 1 dòng nếu cần
   - **cards**: LUÔN tạo đúng 4 thẻ tóm tắt các điểm chính. Mỗi label ngắn gọn 3-8 từ, có ý nghĩa cụ thể
   - **cta**: Call-to-action nếu nội dung mang tính quảng bá

VÍ DỤ:
Input: "Bài viết về 5 thay đổi chính sách thuế TNCN 2025: tăng giảm trừ gia cảnh, giảm thuế suất bậc 1, miễn thuế thu nhập dưới 15 triệu, hỗ trợ startup, số hóa kê khai"
Output:
- banner: "THUẾ TNCN 2025"
- heroText: "5 THAY ĐỔI"  
- cards: ["Tăng giảm trừ gia cảnh", "Giảm thuế suất bậc 1", "Miễn thuế dưới 15 triệu", "Hỗ trợ startup"]

VÍ DỤ 2:
Input: "Tổng hợp xu hướng marketing digital 2025: AI content, short-form video, social commerce"
Output:
- banner: "XU HƯỚNG 2025"
- heroText: "TOP 3"
- cards: ["AI tạo nội dung", "Video ngắn bùng nổ", "Social commerce", "Cá nhân hóa trải nghiệm"]

QUY TẮC:
- LUÔN sáng tạo nội dung overlay có ý nghĩa, KHÔNG chỉ copy nguyên văn
- Banner phải IN HOA, 2-4 từ
- Hero text phải nổi bật (số liệu hoặc keyword mạnh)
- Cards LUÔN có đúng 4 items, mỗi item 3-8 từ tiếng Việt rõ ràng
- backgroundPrompt phải KẾT THÚC bằng "IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements in the image."
- Mọi text tiếng Việt phải chính xác ngữ pháp và dấu`;

    const userPrompt = `Phân tích và SÁNG TẠO nội dung infographic từ mô tả sau:

---
${description}
---

Primary color: ${primaryColor}
Secondary color: ${secondaryColor}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "decompose_image_request",
              description: "Decompose a complex image description into background prompt and overlay config",
              parameters: {
                type: "object",
                properties: {
                  backgroundPrompt: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                        description: "Clean visual background prompt for AI image generation. Must end with instruction to not include text.",
                      },
                      mood: {
                        type: "string",
                        description: "Overall mood/atmosphere (e.g., 'professional, modern')",
                      },
                      elements: {
                        type: "array",
                        items: { type: "string" },
                        description: "Key visual elements to include (e.g., 'city skyline', 'Vietnamese businessperson')",
                      },
                    },
                    required: ["description", "mood", "elements"],
                  },
                  overlayConfig: {
                    type: "object",
                    properties: {
                      banner: {
                        type: "object",
                        properties: {
                          text: { type: "string", description: "2-4 word UPPERCASE label summarizing the topic" },
                          position: { type: "string", enum: ["top", "bottom"] },
                        },
                        required: ["text", "position"],
                      },
                      heroText: {
                        type: "object",
                        properties: {
                          text: { type: "string", description: "Key statistic or powerful keyword, max 20 chars" },
                          fontSize: { type: "string", enum: ["xl", "2xl", "3xl"] },
                          effect: { type: "string", enum: ["none", "gradient"] },
                        },
                        required: ["text", "fontSize"],
                      },
                      headline: { type: "string", description: "Main headline text" },
                      cards: {
                        type: "object",
                        properties: {
                          items: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                icon: { type: "string" },
                                label: { type: "string", description: "3-8 word meaningful summary point" },
                              },
                              required: ["label"],
                            },
                            description: "Exactly 4 summary cards with meaningful labels",
                          },
                          layout: { type: "string", enum: ["grid-2x2", "horizontal", "vertical"] },
                        },
                        required: ["items", "layout"],
                      },
                      cta: { type: "string", description: "Call-to-action text" },
                    },
                  },
                },
                required: ["backgroundPrompt", "overlayConfig"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "decompose_image_request" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Validate and fix overlay fields
    const validatedOverlay = validateOverlay(parsed.overlayConfig || {}, primaryColor);

    const result = {
      backgroundPrompt: {
        ...parsed.backgroundPrompt,
        colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
      },
      overlayConfig: {
        ...validatedOverlay,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          text: "#FFFFFF",
        },
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("decompose-image-request error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
