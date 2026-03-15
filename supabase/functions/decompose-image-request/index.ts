import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const systemPrompt = `Bạn là chuyên gia phân tích yêu cầu thiết kế hình ảnh. Nhiệm vụ: tách mô tả hình ảnh phức tạp thành 2 phần:

1. **backgroundPrompt**: Mô tả CHÍNH XÁC phần hình ảnh nền (visual, atmosphere, illustration, nhân vật, phong cảnh). KHÔNG bao gồm text, số liệu, thẻ thông tin, nút bấm. Prompt này sẽ được gửi cho AI tạo ảnh nền.

2. **overlayConfig**: Cấu hình các thành phần text/layout sẽ được render bằng code (Satori) lên trên ảnh nền. Bao gồm:
   - banner: text hiển thị trên banner (ví dụ: "DỰ KIẾN", "TIN NÓNG")
   - heroText: text/số lớn nổi bật (ví dụ: "100%", "50 triệu")
   - headline: tiêu đề chính
   - cards: danh sách thẻ thông tin với label
   - cta: call-to-action text

Quy tắc:
- backgroundPrompt phải KẾT THÚC bằng "IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements in the image."
- Mọi text tiếng Việt, số liệu, thẻ card phải nằm trong overlayConfig
- Nếu mô tả có nhân vật, giữ trong backgroundPrompt
- Nếu mô tả có skyline/phong cảnh, giữ trong backgroundPrompt`;

    const userPrompt = `Phân tích mô tả sau và tách thành backgroundPrompt và overlayConfig:

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
                          text: { type: "string" },
                          position: { type: "string", enum: ["top", "bottom"] },
                        },
                        required: ["text", "position"],
                      },
                      heroText: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
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
                                label: { type: "string" },
                              },
                              required: ["label"],
                            },
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

    // Inject colors into overlayConfig
    const result = {
      backgroundPrompt: {
        ...parsed.backgroundPrompt,
        colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
      },
      overlayConfig: {
        ...parsed.overlayConfig,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          text: "#FFFFFF",
        },
        // Inject banner color
        ...(parsed.overlayConfig.banner
          ? {
              banner: {
                ...parsed.overlayConfig.banner,
                bgColor: primaryColor,
              },
            }
          : {}),
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
