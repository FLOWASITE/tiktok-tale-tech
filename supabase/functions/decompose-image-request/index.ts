import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Post-processing: validate and fix overlay fields */
function validateOverlay(overlay: any, primaryColor: string): any {
  const result = { ...overlay };

  // Banner: ensure non-empty, ≤ 40 chars (raised for Vietnamese)
  if (result.banner) {
    if (!result.banner.text || result.banner.text.trim().length === 0) {
      delete result.banner;
    } else {
      // Smart truncate at word boundary
      let bannerText = result.banner.text.trim();
      if (bannerText.length > 40) {
        const truncated = bannerText.slice(0, 40);
        const lastSpace = truncated.lastIndexOf(' ');
        bannerText = lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated;
      }
      result.banner.text = bannerText;
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
        .map((c: any) => ({
          icon: c.icon || undefined,
          label: c.label.trim().slice(0, 60),
          ...(c.description ? { description: c.description.trim().slice(0, 80) } : {}),
          ...(c.number != null ? { number: c.number } : {}),
        }));

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

  // Footer: validate items
  if (result.footer) {
    if (!result.footer.items || !Array.isArray(result.footer.items)) {
      delete result.footer;
    } else {
      result.footer.items = result.footer.items
        .filter((f: any) => f.text && f.text.trim().length > 0)
        .map((f: any) => ({
          icon: f.icon || undefined,
          text: f.text.trim().slice(0, 60),
        }))
        .slice(0, 4);
      if (result.footer.items.length === 0) delete result.footer;
    }
  }

  // SummaryRibbon: validate
  if (result.summaryRibbon) {
    if (!result.summaryRibbon.text || result.summaryRibbon.text.trim().length === 0) {
      delete result.summaryRibbon;
    } else {
      result.summaryRibbon.text = result.summaryRibbon.text.trim().slice(0, 80);
    }
  }

  return result;
}

/** Determine layout type based on content */
function determineLayout(overlay: any): string {
  const hasCards = overlay.cards?.items?.length >= 3;
  const hasHero = !!overlay.heroText || !!overlay.headline;
  // Split layout when we have both hero content and multiple cards
  if (hasCards && hasHero) return 'split';
  if (overlay.banner && hasCards) return 'banner_cards';
  if (hasHero) return 'hero_text';
  return 'simple';
}

Deno.serve(withPerf({ functionName: 'decompose-image-request', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const { description, primaryColor = "#DC2626", secondaryColor = "#FFFFFF", context, imageStyle } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "Missing description" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve organizationId from context if available
    const organizationId = context?.organizationId || undefined;

    // Build strategic context section if provided
    const contentRole = context?.contentRole || '';
    const contentGoal = context?.contentGoal || '';
    const contentAngle = context?.contentAngle || '';
    const topic = context?.topic || '';

    // Style-based layout preference mapping
    const STYLE_LAYOUT_HINTS: Record<string, string> = {
      minimalist: 'hero_text hoặc simple (ưu tiên không gian trống, tối giản)',
      flat_design: 'infographic hoặc education_infographic (ưu tiên cards blocky, data-driven)',
      gradient: 'hero_text hoặc quote_card (ưu tiên hero text lớn trên nền gradient)',
      geometric: 'infographic hoặc feature_list (ưu tiên split layout, cấu trúc cột)',
      illustration: 'quote_card hoặc hero_text (ưu tiên storytelling, cảm xúc)',
      product_only: 'poster hoặc simple (ưu tiên sản phẩm trung tâm, CTA mạnh)',
    };
    const styleHint = imageStyle && STYLE_LAYOUT_HINTS[imageStyle] 
      ? `\n- Phong cách ảnh (Image Style): ${imageStyle} → Ưu tiên layout: ${STYLE_LAYOUT_HINTS[imageStyle]}`
      : '';

    const strategicContext = (contentRole || contentGoal || contentAngle || styleHint) ? `
BỐI CẢNH CHIẾN LƯỢC:
${contentGoal ? `- Mục tiêu nội dung (Content Goal): ${contentGoal}` : ''}
${contentRole ? `- Vai trò nội dung (Content Role): ${contentRole} ${contentRole === 'seed' ? '(Awareness - thu hút, không bán hàng)' : contentRole === 'sprout' ? '(Trust - xây dựng niềm tin, phân tích sâu)' : '(Conversion - CTA mạnh, bán hàng)'}` : ''}
${contentAngle ? `- Góc tiếp cận: ${contentAngle}` : ''}
${topic ? `- Chủ đề gốc: ${topic}` : ''}${styleHint}

CHIẾN LƯỢC CHỌN LAYOUT (suggestedLayout):
- Nội dung giáo dục/kiến thức có nhiều điểm + có thông tin liên hệ → "education_infographic" (banner + cards đánh số + ribbon tóm tắt + CTA + footer liên hệ)
- Nội dung giáo dục/kiến thức có nhiều điểm (education, sprout, educational) → "infographic" (chia đôi: hero trái + cards phải)
- Nội dung cảm xúc/nhận diện thương hiệu (awareness, seed, storytelling) → "quote_card" (hero text lớn, cảm xúc)
- Nội dung bán hàng/chuyển đổi (conversion, harvest, promotional) → "poster" (CTA nổi bật) hoặc "contact_card" (nếu có thông tin liên hệ)
- Nội dung có số liệu nổi bật → "quote_card" với heroText là số liệu
- Nội dung liệt kê tính năng/lợi ích → "feature_list" (banner + danh sách dọc)
- Nội dung Q&A, behind_the_scenes → "poster" (đơn giản, headline + CTA)
- **Nếu có Image Style hint ở trên, ƯU TIÊN layout phù hợp style đó**
` : '';

    const systemPrompt = `Bạn là chuyên gia thiết kế infographic. Nhiệm vụ: từ nội dung bài viết (có thể dài, narrative), bạn phải PHÂN TÍCH SÂU nội dung và SÁNG TẠO infographic gồm 3 phần:

1. **suggestedLayout**: Chọn layout phù hợp nhất dựa trên phân tích nội dung và bối cảnh chiến lược
2. **backgroundPrompt**: Mô tả hình ảnh nền (visual, atmosphere). KHÔNG bao gồm text, số, UI
3. **overlayConfig**: SÁNG TẠO các thành phần text overlay có ý nghĩa, RÚT GỌN từ nội dung gốc
${strategicContext}
OVERLAY ELEMENTS:
   - **banner**: Nhãn ngắn gọn 2-5 từ IN HOA tóm tắt chủ đề, TỐI ĐA 40 ký tự (VD: "CHÍNH SÁCH MỚI", "CẬP NHẬT THUẾ", "TIN NÓNG", "KIẾN THỨC HAY")
   - **heroText**: Số liệu nổi bật hoặc keyword mạnh ≤ 20 ký tự. PHẢI là keyword/số liệu NỔI BẬT NHẤT, KHÔNG phải câu dài. Ưu tiên: số + đơn vị (VD: "30%", "5 THAY ĐỔI"), keyword ngắn gọn. NẾU nội dung có số + text ngắn (VD: "3 bước"), LUÔN dùng format "3 BƯỚC" (số + text IN HOA)
   - **headline**: Tiêu đề chính 1 dòng nếu cần
    - **cards**: Tạo 3-5 thẻ CHỈ KHI nội dung có nhiều điểm chính (giáo dục, liệt kê, so sánh). KHÔNG tạo cards cho nội dung cảm xúc/storytelling/quote/awareness. Mỗi label ngắn gọn 3-10 từ (TỐI ĐA 60 ký tự cho tiếng Việt), LUÔN thêm icon emoji phù hợp. Thêm field "number" (1,2,3...) khi layout là education_infographic. Thêm field "description" (mô tả ngắn ≤80 ký tự) khi education_infographic hoặc nội dung cần giải thích chi tiết
    - **cta**: Call-to-action (chỉ khi conversion/harvest/promotional hoặc education_infographic)
    - **summaryRibbon**: Dải ribbon tóm tắt 1 câu ngắn gọn giữa cards và CTA (chỉ cho education_infographic)
    - **footer**: Thanh thông tin liên hệ ở cuối (chỉ khi có SĐT/email/website/địa chỉ trong nội dung)

QUY TẮC TEXT QUALITY:
- Ưu tiên giữ nguyên SỐ LIỆU CỤ THỂ, TÊN RIÊNG. Chỉ rút gọn phần mô tả
- Tiếng Việt dài hơn tiếng Anh ~30%, nên cho phép nhiều ký tự hơn
- Hero text PHẢI là keyword/số liệu nổi bật nhất, KHÔNG phải câu dài
- Cards label: tóm tắt ĐIỂM CHÍNH, dùng từ ngắn gọn nhưng có nghĩa

VÍ DỤ:
Input: "Bài viết về 5 thay đổi chính sách thuế TNCN 2025: tăng giảm trừ gia cảnh, giảm thuế suất bậc 1, miễn thuế thu nhập dưới 15 triệu, hỗ trợ startup, số hóa kê khai" (Goal: education, Role: sprout, Angle: educational)
Output:
- suggestedLayout: "infographic"
- banner: "THUẾ TNCN 2025"
- heroText: "5 THAY ĐỔI"  
- cards: [{icon: "📊", label: "Tăng giảm trừ gia cảnh", description: "Mức giảm trừ tăng lên 13.5 triệu/tháng"}, {icon: "💰", label: "Giảm thuế suất bậc 1", description: "Thuế suất 5% áp dụng đến 7 triệu"}, {icon: "✅", label: "Miễn thuế dưới 15 triệu", description: "Thu nhập chịu thuế dưới 15 triệu được miễn"}, {icon: "🚀", label: "Hỗ trợ startup", description: "Giảm 50% thuế TNCN cho startup"}]

VÍ DỤ 2:
Input: "Câu chuyện cảm hứng về người sáng lập startup vượt khó" (Goal: awareness, Role: seed, Angle: storytelling)
Output:
- suggestedLayout: "quote_card"
- banner: "CÂU CHUYỆN KHỞI NGHIỆP"
- heroText: "VƯỢT KHÓ"
- (KHÔNG có cards vì storytelling cần hero text lớn, cảm xúc)

VÍ DỤ 3:
Input: "Dịch vụ kế toán ABC - giảm 30% tháng này - hotline 0901234567" (Goal: conversion, Role: harvest, Angle: promotional)
Output:
- suggestedLayout: "poster"
- banner: "ƯU ĐÃI ĐẶC BIỆT"
- heroText: "GIẢM 30%"
- cta: "Gọi ngay 0901234567"
- footer: [{icon: "📞", text: "0901234567"}]

QUY TẮC:
- ĐỌC KỸ nội dung bài viết để hiểu ý chính, KHÔNG chỉ copy nguyên văn
- Banner phải IN HOA, 2-4 từ, phản ánh ĐÚNG chủ đề
- Hero text phải nổi bật — lấy từ nội dung thực (số liệu, keyword mạnh nhất)
- KHÔNG tạo cả headline lẫn heroText cùng lúc — chọn 1 trong 2
- Cards phải tóm tắt CÁC ĐIỂM CHÍNH thực sự trong bài, KHÔNG generic
- CTA chỉ tạo khi conversion/harvest/promotional. Nội dung giáo dục/tin tức KHÔNG cần CTA
- Footer chỉ tạo khi có thông tin liên hệ CỤ THỂ
- backgroundPrompt phải KẾT THÚC bằng "IMPORTANT: Do NOT include any text, numbers, letters, words, labels, UI elements in the image."
- Mọi text tiếng Việt phải chính xác ngữ pháp và dấu`;

    const userPrompt = `Phân tích và SÁNG TẠO nội dung infographic từ bài viết sau:

---
${description.slice(0, 3000)}
---

Primary color: ${primaryColor}
Secondary color: ${secondaryColor}`;

    const toolSpec = {
      type: "function" as const,
      function: {
        name: "decompose_image_request",
        description: "Decompose content into background prompt, overlay config, and suggested layout",
        parameters: {
          type: "object",
          properties: {
            suggestedLayout: {
              type: "string",
              enum: ["poster", "infographic", "quote_card", "feature_list", "contact_card", "education_infographic"],
              description: "Best layout template based on content analysis and strategic context",
            },
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
                          label: { type: "string", description: "3-8 word meaningful summary point from actual content" },
                          description: { type: "string", description: "Optional subtitle/detail for this card, max 60 chars. Use for education_infographic or detailed content" },
                          number: { type: "number", description: "Numbered index (1,2,3...) for education_infographic layout" },
                        },
                        required: ["label"],
                      },
                      description: "Summary cards with meaningful labels extracted from content. Add 'number' field for education_infographic.",
                    },
                    layout: { type: "string", enum: ["grid-2x2", "horizontal", "vertical"] },
                  },
                  required: ["items", "layout"],
                },
                cta: { type: "string", description: "Call-to-action text (for conversion/harvest content or education_infographic)" },
                summaryRibbon: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "1-sentence summary ribbon text (for education_infographic)" },
                    bgColor: { type: "string", description: "Optional background color for ribbon" },
                  },
                  required: ["text"],
                },
                footer: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          icon: { type: "string", description: "Emoji icon for this contact item (📞📍🌐📧)" },
                          text: { type: "string", description: "Contact info text (phone, address, website, email)" },
                        },
                        required: ["text"],
                      },
                      description: "Contact info items for footer bar. Only include when content has contact details.",
                    },
                  },
                  required: ["items"],
                },
              },
            },
          },
          required: ["suggestedLayout", "backgroundPrompt", "overlayConfig"],
          additionalProperties: false,
        },
      },
    };

    // Helper: call AI gateway with a given model
    const callAI = async (model: string) => {
      return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [toolSpec],
          tool_choice: { type: "function", function: { name: "decompose_image_request" } },
        }),
      });
    };

    // Primary model call with fallback chain on 402 (credits exhausted)
    const PRIMARY_MODEL = "google/gemini-2.5-flash";
    const FALLBACK_MODELS = ["google/gemini-2.5-flash-lite", "google/gemini-3-flash-preview"];
    let usedModel = PRIMARY_MODEL;
    let bodyConsumed = false;

    let response = await callAI(PRIMARY_MODEL);

    if (response.status === 402) {
      console.warn(`[decompose-image-request] Primary model (${PRIMARY_MODEL}) credits exhausted, trying fallbacks...`);
      await response.text(); // consume body to avoid leak
      bodyConsumed = true;

      for (const fallbackModel of FALLBACK_MODELS) {
        console.log(`[decompose-image-request] Trying fallback model: ${fallbackModel}`);
        response = await callAI(fallbackModel);
        bodyConsumed = false;
        if (response.status !== 402) {
          usedModel = fallbackModel;
          console.log(`[decompose-image-request] Fallback model ${fallbackModel} responded (status: ${response.status})`);
          break;
        }
        console.warn(`[decompose-image-request] Fallback ${fallbackModel} also returned 402`);
        await response.text(); // consume body
        bodyConsumed = true;
      }
    }

    if (!response.ok) {
      const status = response.status;
      const errText = bodyConsumed ? '(body already consumed)' : await response.text();
      console.error("AI gateway error:", status, errText);

      if (status === 429) {
        // Return 200 with error payload so client-side fallback (regex decomposition) can activate
        return new Response(JSON.stringify({ error: "Rate limit exceeded", errorCode: "RATE_LIMIT" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        // All models exhausted — return 200 with error payload for graceful client fallback
        return new Response(JSON.stringify({ error: "AI credits exhausted", errorCode: "CREDITS_EXHAUSTED" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
    const layout = determineLayout(validatedOverlay);

    const result = {
      suggestedLayout: parsed.suggestedLayout || null,
      backgroundPrompt: {
        ...parsed.backgroundPrompt,
        colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
      },
      overlayConfig: {
        ...validatedOverlay,
        layout,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          text: "#FFFFFF",
        },
      },
    };

    console.log('[decompose-image-request] suggestedLayout:', result.suggestedLayout, 'detectedLayout:', layout);

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const model = usedModel;
    const inputTokens = estimateTokens(description);
    const outputTokens = estimateTokens(JSON.stringify(result));
    const estimatedCostUsd = estimateCost(model, inputTokens, outputTokens);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const userId = await resolveUserId(req, sb);
      saveMetrics(sb, {
        traceId,
        functionName: 'decompose-image-request',
        userId,
        totalDurationMs,
        aiCallDurationMs: totalDurationMs,
        inputTokensEstimated: inputTokens,
        outputTokensEstimated: outputTokens,
        estimatedCostUsd,
        modelsUsed: { text: model },
        hadError: false,
        contextSources: [],
        actionType: 'content_analysis',
      }).catch(() => {});
    } catch {}

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("decompose-image-request error:", err);

    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'decompose-image-request',
        totalDurationMs,
        hadError: true,
        errorType: err instanceof Error ? err.name : 'Unknown',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        contextSources: [],
        actionType: 'content_analysis',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
