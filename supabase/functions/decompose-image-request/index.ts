import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { applyTextBudgetsToOverlay, buildAiRenderPlan } from "../image-render-spec.ts";

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
    const { description, primaryColor = "#DC2626", secondaryColor = "#FFFFFF", context, imageStyle, channel, aspectRatio, logoSafeZone } = await req.json();

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
- Nội dung so sánh, before/after, A/B, đúng/sai → "comparison_card" (2 cột đối chiếu + CTA)
- Nội dung quy trình, step-by-step, timeline, hướng dẫn → "timeline_steps" (cards dọc đánh số + CTA)
- Nội dung số liệu/KPI/research insight có con số nổi bật → "stat_spotlight" (hero number lớn + headline ngắn)
- Nội dung review/chứng thực/case study khách hàng → "testimonial_card" (quote/review nổi bật + trust CTA)
- Nội dung ra mắt sản phẩm/dịch vụ/USP chính → "product_spotlight" (headline + benefits + CTA)
- Nội dung thought leadership/trend/opinion/personal brand → "editorial_cover" (headline tối giản, sang trọng)
- Nội dung pain point → giải pháp → "problem_solution" (nêu vấn đề + bullet giải pháp + CTA)
- Nội dung checklist/quick tips/save-worthy → "checklist_card" (danh sách dọc dễ scan)
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

VÍ DỤ 4:
Input: "Before after điều trị nám: da đều màu hơn sau 8 tuần, giảm 65% sắc tố" 
Output:
- suggestedLayout: "comparison_card"
- banner: "BEFORE / AFTER"
- cards: [{icon: "⬅️", label: "Trước điều trị", description: "Sắc tố đậm, da xỉn màu"}, {icon: "➡️", label: "Sau 8 tuần", description: "Da sáng hơn, giảm 65% sắc tố"}]

VÍ DỤ 5:
Input: "3 bước chăm da sau laser để phục hồi nhanh, giảm đỏ rát và giữ kết quả lâu hơn"
Output:
- suggestedLayout: "timeline_steps"
- banner: "3 BƯỚC PHỤC HỒI"
- cards: [{icon: "🧼", number: 1, label: "Làm sạch dịu nhẹ"}, {icon: "💧", number: 2, label: "Phục hồi cấp ẩm"}, {icon: "🛡️", number: 3, label: "Chống nắng kỹ"}]

VÍ DỤ 6:
Input: "92% khách hàng quay lại sau liệu trình đầu tiên nhờ quy trình cá nhân hóa"
Output:
- suggestedLayout: "stat_spotlight"
- banner: "TỶ LỆ QUAY LẠI"
- heroText: "92%"
- headline: "Khách hàng quay lại sau liệu trình đầu tiên"

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
              enum: ["poster", "infographic", "quote_card", "feature_list", "contact_card", "education_infographic", "comparison_card", "timeline_steps", "stat_spotlight", "testimonial_card", "product_spotlight", "editorial_cover", "problem_solution", "checklist_card"],
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

    // Use shared AI provider with dynamic config + multi-provider fallback
    const aiResult = await callAIProvider({
      functionName: 'decompose-image-request',
      organizationId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [toolSpec],
      toolChoice: { type: "function", function: { name: "decompose_image_request" } },
    });

    const usedModel = aiResult.model || 'unknown';

    if (!aiResult.success) {
      const errorMsg = aiResult.error || 'AI call failed';
      console.error("[decompose-image-request] AI call failed:", errorMsg);

      // Check for credits exhausted or rate limit from provider
      const errorLower = errorMsg.toLowerCase();
      if (errorLower.includes('402') || errorLower.includes('credits') || errorLower.includes('payment') || errorLower.includes('credits_exhausted')) {
        return new Response(JSON.stringify({ error: "AI credits exhausted", errorCode: "CREDITS_EXHAUSTED" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (errorLower.includes('429') || errorLower.includes('rate') || errorLower.includes('rate_limit')) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", errorCode: "RATE_LIMIT" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed", fallback: true, details: errorMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = aiResult.data;
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const messageContent = data?.choices?.[0]?.message?.content;

    // Fallback: some models (e.g. after model swap) return JSON in content instead of tool_calls
    let rawArguments: string | undefined = toolCall?.function?.arguments;
    if (!rawArguments && typeof messageContent === 'string' && messageContent.trim().length > 0) {
      console.warn('[decompose-image-request] No tool_call returned, falling back to message.content parsing. Model:', usedModel);
      rawArguments = messageContent;
    }

    if (!rawArguments) {
      console.error("[decompose-image-request] No tool call or content in response. Model:", usedModel, "data:", JSON.stringify(data).slice(0, 500));
      // Return 200 with fallback flag so client uses regex fallback gracefully (no 500 toast)
      return new Response(JSON.stringify({ error: "AI did not return structured data", fallback: true, model: usedModel }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      // Attempt to salvage truncated JSON from LLM output
      console.warn('[decompose-image-request] JSON parse failed, attempting recovery. Raw length:', toolCall.function.arguments.length);
      try {
        let raw = toolCall.function.arguments;
        // Strip markdown fences if present
        raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        // Remove control characters
        raw = raw.replace(/[\x00-\x1F\x7F]/g, ' ');
        // Remove trailing commas before } or ]
        raw = raw.replace(/,\s*([}\]])/g, '$1');

        // FIRST: try to extract the first balanced JSON object/array
        // (handles "trailing garbage after JSON" — the most common Qwen failure mode)
        const firstChar = raw.search(/[\{\[]/);
        if (firstChar !== -1) {
          const openCh = raw[firstChar];
          const closeCh = openCh === '{' ? '}' : ']';
          let depth = 0;
          let inStr = false;
          let escape = false;
          let endIdx = -1;
          for (let i = firstChar; i < raw.length; i++) {
            const c = raw[i];
            if (escape) { escape = false; continue; }
            if (c === '\\') { escape = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c === openCh) depth++;
            else if (c === closeCh) {
              depth--;
              if (depth === 0) { endIdx = i; break; }
            }
          }
          if (endIdx !== -1) {
            const candidate = raw.substring(firstChar, endIdx + 1);
            try {
              parsed = JSON.parse(candidate);
              console.log('[decompose-image-request] JSON recovery succeeded by extracting first balanced object');
            } catch { /* fall through to progressive repair */ }
          }
        }

        // Progressive repair: trim trailing incomplete content and try parsing
        if (!parsed)
        for (let attempt = 0; attempt < 5; attempt++) {
          // Remove trailing incomplete key-value pairs
          raw = raw
            .replace(/,\s*"[^"]*"?\s*:\s*"[^"]*$/, '')  // incomplete string value
            .replace(/,\s*"[^"]*"?\s*:\s*[^,}\]]*$/, '') // incomplete non-string value  
            .replace(/,\s*"[^"]*$/, '')                    // incomplete key
            .replace(/,\s*\{[^}]*$/, '')                   // incomplete object in array
            .replace(/,\s*$/, '');                          // trailing comma
          
          // Re-count and close missing braces/brackets
          let opens = 0, closes = 0;
          for (const ch of raw) { if (ch === '{') opens++; if (ch === '}') closes++; }
          let openB = 0, closeB = 0;
          for (const ch of raw) { if (ch === '[') openB++; if (ch === ']') closeB++; }
          
          let candidate = raw;
          if (openB > closeB) candidate += ']'.repeat(openB - closeB);
          if (opens > closes) candidate += '}'.repeat(opens - closes);
          candidate = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          
          try {
            parsed = JSON.parse(candidate);
            console.log(`[decompose-image-request] JSON recovery succeeded on attempt ${attempt + 1}`);
            break;
          } catch (_e) {
            if (attempt === 4) throw _e;
          }
        }
      } catch (recoveryErr) {
        console.error('[decompose-image-request] JSON recovery also failed:', (recoveryErr as Error).message);
        return new Response(JSON.stringify({ error: "AI returned malformed data, please retry" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validate and fix overlay fields
    const validatedOverlay = validateOverlay(parsed.overlayConfig || {}, primaryColor);
    const aiRenderPlan = buildAiRenderPlan({
      channel,
      aspectRatio,
      suggestedLayout: parsed.suggestedLayout || null,
      overlay: validatedOverlay,
      logoSafeZone,
    });
    const budgetedOverlay = applyTextBudgetsToOverlay(validatedOverlay, aiRenderPlan.renderSpec);
    const layout = determineLayout(budgetedOverlay);

    const result = {
      suggestedLayout: parsed.suggestedLayout || null,
      backgroundPrompt: {
        ...parsed.backgroundPrompt,
        colorScheme: `Primary: ${primaryColor}, Secondary: ${secondaryColor}`,
      },
      overlayConfig: {
        ...budgetedOverlay,
        layout,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          text: "#FFFFFF",
        },
      },
      renderSpec: aiRenderPlan.renderSpec,
      layoutBehavior: aiRenderPlan.layoutBehavior,
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
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
