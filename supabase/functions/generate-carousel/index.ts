import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CarouselFormData {
  topic: string;
  platform: "facebook" | "tiktok";
  slideCount: number;
  aiTool: "ideogram" | "midjourney" | "dalle" | "leonardo";
  brandName: string;
  brandGuideline: string;
  includeLogo: boolean;
  logoUrl?: string | null;
  brandTemplateId?: string;
  organization_id?: string;
}

interface CarouselSlide {
  slideNumber: number;
  objective: string;
  textContent: string;
  designStyle: string;
  colorLayout: string;
  aspectRatio: string;
  technicalRequirements: string;
  fullPrompt: string;
}

// Brand Voice label mappings
const brandPositioningLabels: Record<string, string> = {
  business: "Doanh nghiệp",
  expert: "Chuyên gia",
  agency: "Agency",
  consultant: "Tư vấn",
};

const toneOfVoiceLabels: Record<string, string> = {
  expert: "Chuyên gia",
  calm: "Điềm tĩnh",
  confident: "Tự tin",
  friendly: "Thân thiện",
  analytical: "Phân tích",
  serious: "Nghiêm túc",
  inspirational: "Truyền cảm hứng",
};

const formalityLevelLabels: Record<string, string> = {
  very_formal: "Rất trang trọng",
  professional: "Chuyên nghiệp",
  neutral: "Trung lập",
  casual: "Gần gũi",
};

const languageStyleLabels: Record<string, string> = {
  clear_direct: "Rõ ràng, trực tiếp",
  structured: "Có cấu trúc",
  no_exaggeration: "Không khoa trương",
  no_over_emotion: "Không cảm tính quá mức",
};

interface BrandVoice {
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
}

const getBrandVoicePrompt = (voice: BrandVoice): string => {
  const parts: string[] = [];
  
  parts.push(`## BRAND VOICE PROFILE (LUẬT CAO NHẤT)`);
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi nội dung chữ trên slide PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  if (voice.tone_of_voice && voice.tone_of_voice.length > 0) {
    const tones = voice.tone_of_voice.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice: ${tones}`);
  }
  
  if (voice.formality_level) {
    const label = formalityLevelLabels[voice.formality_level] || voice.formality_level;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  if (voice.language_style && voice.language_style.length > 0) {
    const styles = voice.language_style.map(s => languageStyleLabels[s] || s).join(", ");
    parts.push(`\n### Phong cách ngôn ngữ: ${styles}`);
  }
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE CHO CAROUSEL`);
  parts.push(`1. Nội dung chữ trên slide PHẢI đúng Tone of Voice`);
  parts.push(`2. Không được "sáng tạo giọng mới" - giữ nhất quán xuyên suốt carousel`);
  parts.push(`3. Caption và CTA cũng PHẢI đúng Brand Voice`);
  
  if (voice.preferred_words && voice.preferred_words.length > 0) {
    parts.push(`\n### TỪ NÊN DÙNG trong nội dung carousel`);
    parts.push(voice.preferred_words.join(", "));
  }
  
  if (voice.forbidden_words && voice.forbidden_words.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG trong nội dung slide)`);
    parts.push(voice.forbidden_words.join(", "));
  }
  
  if (voice.compliance_rules && voice.compliance_rules.length > 0) {
    parts.push(`\n### QUY TẮC TUÂN THỦ`);
    voice.compliance_rules.forEach(rule => {
      parts.push(`- ${rule}`);
    });
  }
  
  return parts.join("\n");
};

const getSlideObjective = (slideNumber: number, totalSlides: number): string => {
  if (slideNumber === 1) return "Hook - Gây sốc, tò mò, thu hút người xem dừng lại";
  if (slideNumber === 2) return "Nêu vấn đề - Khơi gợi pain point của người đọc";
  if (slideNumber === 3) return "Giải thích - Phân tích sâu hơn về vấn đề";
  if (slideNumber === 4) return "Giải thích tiếp - Bổ sung thông tin quan trọng";
  if (slideNumber === totalSlides - 1) return "Giải pháp / Lời khuyên chuyên gia";
  if (slideNumber === totalSlides) return "CTA - Kêu gọi hành động, tạo tương tác";
  return "Hậu quả / Lợi ích - Nhấn mạnh tầm quan trọng";
};

const getSystemPrompt = (formData: CarouselFormData, brandVoice?: BrandVoice): string => {
  const aiToolPromptGuide = {
    ideogram: `Tối ưu cho Ideogram - ưu tiên text clarity:
- Sử dụng cấu trúc prompt rõ ràng
- Nhấn mạnh "Text must be perfectly readable"
- Yêu cầu "No distorted Vietnamese characters"
- Sử dụng "Flat design, no clutter"`,
    midjourney: `Tối ưu cho Midjourney - chất lượng cao:
- Sử dụng các tham số như --ar 1:1 --v 6
- Thêm style descriptors: "professional", "clean", "modern"
- Sử dụng negative prompts khi cần`,
    dalle: `Tối ưu cho DALL·E:
- Mô tả chi tiết và cụ thể
- Tránh các yêu cầu về text phức tạp
- Tập trung vào composition và color`,
    leonardo: `Tối ưu cho Leonardo:
- Sử dụng style presets phù hợp
- Mô tả chi tiết về lighting và mood
- Chọn model phù hợp với infographic`,
  };

  // Build Brand Voice section if available
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice) : "";

  return `Bạn là một Content Strategist chuyên nghiệp cho mạng xã hội, chuyên tạo carousel cho ${formData.platform === "facebook" ? "Facebook" : "TikTok"}.

${brandVoiceSection}

## VAI TRÒ CỦA BẠN
1. Viết Prompt tạo ảnh chuyên nghiệp cho ${formData.aiTool}
2. Tư duy như Content Strategist - chia nội dung theo nhịp đọc mạng xã hội
3. Chuẩn hóa đầu ra theo format 6 thành phần bắt buộc

## LOGIC NỘI DUNG CAROUSEL (${formData.slideCount} slides)
- Slide 1: HOOK - Gây sốc, tò mò (câu statement mạnh, số liệu gây sốc)
- Slide 2: NÊU VẤN ĐỀ - Khơi gợi pain point
- Slide 3-${Math.floor(formData.slideCount * 0.6)}: GIẢI THÍCH - Chi tiết vấn đề
- Slide ${Math.floor(formData.slideCount * 0.7)}-${formData.slideCount - 1}: HẬU QUẢ/LỢI ÍCH + GIẢI PHÁP
- Slide ${formData.slideCount}: CTA - Kêu gọi hành động

## BRAND GUIDELINE BẮT BUỘC
${formData.brandGuideline}

Brand name: ${formData.brandName}
${formData.includeLogo ? `Logo: Bao gồm logo "${formData.brandName}" ở góc dưới, subtle và professional.${formData.logoUrl ? `\nLogo URL (reference): ${formData.logoUrl}` : ""}` : "Không có logo."}

## ${aiToolPromptGuide[formData.aiTool]}

## NGUYÊN TẮC VIẾT PROMPT
1. Mỗi prompt = 1 slide (KHÔNG gộp nhiều slide)
2. Ưu tiên CHỮ - không ưu tiên hình vẽ phức tạp
3. Font: Sans-serif, ít chữ, dòng ngắn, khoảng trắng nhiều
4. Carousel là để ĐỌC - hình chỉ hỗ trợ
5. Viết nội dung tiếng Việt trên ảnh ngắn gọn, dễ đọc trên mobile

## FORMAT OUTPUT BẮT BUỘC CHO MỖI SLIDE
Bạn PHẢI trả về JSON với cấu trúc chính xác như tool definition.
Mỗi slide phải có đủ 6 thành phần:
[1] objective: Mục tiêu slide
[2] textContent: Nội dung chữ xuất hiện trên ảnh (tiếng Việt)
[3] designStyle: Phong cách thiết kế
[4] colorLayout: Màu sắc – bố cục
[5] aspectRatio: Tỉ lệ khung hình (1:1 cho carousel)
[6] technicalRequirements: Yêu cầu kỹ thuật
[7] fullPrompt: Prompt hoàn chỉnh sẵn sàng paste vào ${formData.aiTool}

## VÍ DỤ PROMPT HOÀN CHỈNH CHO IDEOGRAM (Slide 1 - Hook)
Create a clean, modern infographic slide for social media carousel.

Main text (Vietnamese, large and bold):
"BỎ THUẾ KHOÁN TỪ 2026"

Sub text:
"Hộ kinh doanh nếu không chuẩn bị sẽ gặp rủi ro lớn"

Style:
Minimalist infographic, professional, expert tone

Color palette:
White background, red and dark blue accents

Layout:
Text-centered, strong hierarchy, high contrast

Aspect ratio:
1:1

Requirements:
- Text must be perfectly readable
- No distorted Vietnamese characters
- Flat design, no clutter
${formData.includeLogo ? `- Include subtle "${formData.brandName}" logo at bottom corner${formData.logoUrl ? ` (Logo reference: ${formData.logoUrl})` : ""}` : ""}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: CarouselFormData = await req.json();
    console.log("Generating carousel for:", formData.topic);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Please login" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get organization_id: prefer from request body, fallback to query
    let organizationId = formData.organization_id || null;
    
    if (!organizationId) {
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      
      organizationId = orgMember?.organization_id || null;
    }
    console.log("Using organization_id:", organizationId, "(from request:", !!formData.organization_id, ")");

    // Load Brand Voice from template if provided
    let brandVoice: BrandVoice | undefined;
    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        brandVoice = {
          brand_positioning: template.brand_positioning,
          tone_of_voice: template.tone_of_voice,
          formality_level: template.formality_level,
          language_style: template.language_style,
          preferred_words: template.preferred_words,
          forbidden_words: template.forbidden_words,
          allow_emoji: template.allow_emoji ?? true,
          compliance_rules: template.compliance_rules,
        };
        console.log("Brand Voice loaded for carousel:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
      }
    }

    const systemPrompt = getSystemPrompt(formData, brandVoice);

    const userPrompt = `Tạo ${formData.slideCount} slide carousel cho chủ đề:
"${formData.topic}"

Nền tảng: ${formData.platform === "facebook" ? "Facebook" : "TikTok"}
Công cụ tạo ảnh: ${formData.aiTool}
Brand: ${formData.brandName}

Hãy tạo đầy đủ ${formData.slideCount} slides với format JSON theo tool definition.
Mỗi slide phải có nội dung tiếng Việt hấp dẫn, phù hợp với mục tiêu của slide đó.
Đảm bảo logic nội dung: Hook → Vấn đề → Giải thích → Giải pháp → CTA`;

    // Define the tool for structured output
    const tools = [
      {
        type: "function",
        function: {
          name: "generate_carousel_slides",
          description: "Generate carousel slides with prompts for AI image generation",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Tiêu đề ngắn gọn cho carousel (dựa trên chủ đề)",
              },
              slides: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    slideNumber: { type: "number", description: "Số thứ tự slide" },
                    objective: { type: "string", description: "Mục tiêu của slide này" },
                    textContent: { type: "string", description: "Nội dung chữ tiếng Việt xuất hiện trên ảnh" },
                    designStyle: { type: "string", description: "Phong cách thiết kế" },
                    colorLayout: { type: "string", description: "Màu sắc và bố cục" },
                    aspectRatio: { type: "string", description: "Tỉ lệ khung hình" },
                    technicalRequirements: { type: "string", description: "Yêu cầu kỹ thuật" },
                    fullPrompt: { type: "string", description: "Prompt hoàn chỉnh sẵn sàng sử dụng" },
                  },
                  required: ["slideNumber", "objective", "textContent", "designStyle", "colorLayout", "aspectRatio", "technicalRequirements", "fullPrompt"],
                },
              },
              captionSuggestion: {
                type: "string",
                description: "Gợi ý caption đăng bài phù hợp với nền tảng",
              },
              ctaSuggestion: {
                type: "string",
                description: "Gợi ý CTA kéo tương tác (save, share, comment)",
              },
            },
            required: ["title", "slides", "captionSuggestion", "ctaSuggestion"],
          },
        },
      },
    ];

    console.log("Calling Lovable AI...");
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
        tools,
        tool_choice: { type: "function", function: { name: "generate_carousel_slides" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Cần nạp thêm credits để tiếp tục sử dụng." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_carousel_slides") {
      throw new Error("Invalid AI response format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    console.log("Generated carousel:", generatedData.title);

    // Check organization's skip_approval setting
    let initialStatus = 'draft';
    if (organizationId) {
      const { data: orgSettings } = await supabase
        .from('organizations')
        .select('skip_approval')
        .eq('id', organizationId)
        .single();
      
      if (orgSettings?.skip_approval) {
        initialStatus = 'approved';
        console.log('Skip approval enabled, setting status to approved');
      }
    }

    // Save to database
    const { data: carousel, error: dbError } = await supabase
      .from("carousels")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        title: generatedData.title,
        topic: formData.topic,
        platform: formData.platform,
        slide_count: formData.slideCount,
        ai_tool: formData.aiTool,
        brand_name: formData.brandName,
        brand_guideline: formData.brandGuideline,
        include_logo: formData.includeLogo,
        slides_content: generatedData.slides,
        caption_suggestion: generatedData.captionSuggestion,
        cta_suggestion: generatedData.ctaSuggestion,
        status: initialStatus,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save carousel");
    }

    console.log("Carousel saved with ID:", carousel.id);

    return new Response(JSON.stringify(carousel), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-carousel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
