import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import {
  runSelfCritiqueLoop,
  CRITIQUE_CONFIG,
  type CritiqueResult,
} from "../_shared/self-critique.ts";
import { saveMetrics, generateTraceId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager, buildPrompt } from "../_shared/prompt-integration.ts";

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
  campaignId?: string;
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

interface IndustryMemory {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_terms: string[];
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
  };
  channel_settings: Record<string, unknown>;
  preferred_words: string[];
  forbidden_words: string[];
}

interface MergedRules {
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_words: string[];
  preferred_words: string[];
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
}

// Fetch Industry Memory from database
async function fetchIndustryMemory(
  supabase: any, 
  industryTemplateId: string, 
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    const { data, error } = await supabase
      .from('industry_templates')
      .select(`
        id,
        code,
        version,
        status,
        target_audience,
        brand_voice,
        channel_settings,
        compliance_rules,
        claim_restrictions,
        forbidden_terms,
        industry_template_translations!inner (
          name,
          preferred_words,
          forbidden_words
        )
      `)
      .eq('id', industryTemplateId)
      .eq('status', 'stable')
      .eq('industry_template_translations.language_code', languageCode)
      .single();

    if (error || !data) {
      console.warn(`Industry Memory ${industryTemplateId} not found or not stable - skipping rules`);
      return null;
    }

    const rawData = data as any;
    const translation = rawData.industry_template_translations?.[0];

    return {
      id: rawData.id,
      code: rawData.code,
      name: translation?.name || rawData.code,
      version: rawData.version || '1.0',
      target_audience: rawData.target_audience,
      compliance_rules: rawData.compliance_rules || [],
      claim_restrictions: rawData.claim_restrictions || [],
      forbidden_terms: translation?.forbidden_terms || [],
      brand_voice: rawData.brand_voice || {},
      channel_settings: rawData.channel_settings || {},
      preferred_words: translation?.preferred_words || [],
      forbidden_words: translation?.forbidden_words || [],
    };
  } catch (err) {
    console.error('Error fetching Industry Memory:', err);
    return null;
  }
}

function buildMergedRules(
  industryMemory: IndustryMemory | null,
  brandVoice: BrandVoice
): MergedRules {
  if (!industryMemory) {
    return {
      forbidden_terms: [],
      compliance_rules: brandVoice.compliance_rules || [],
      claim_restrictions: [],
      forbidden_words: brandVoice.forbidden_words || [],
      preferred_words: brandVoice.preferred_words || [],
      tone_of_voice: brandVoice.tone_of_voice || [],
      formality_level: brandVoice.formality_level || 'professional',
      language_style: brandVoice.language_style || [],
      allow_emoji: brandVoice.allow_emoji ?? true,
    };
  }

  return {
    forbidden_terms: industryMemory.forbidden_terms,
    compliance_rules: industryMemory.compliance_rules,
    claim_restrictions: industryMemory.claim_restrictions,
    forbidden_words: [
      ...industryMemory.forbidden_words,
      ...(brandVoice.forbidden_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    preferred_words: [
      ...industryMemory.preferred_words,
      ...(brandVoice.preferred_words || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    tone_of_voice: brandVoice.tone_of_voice?.length 
      ? brandVoice.tone_of_voice 
      : industryMemory.brand_voice.tone_of_voice || [],
    formality_level: brandVoice.formality_level 
      || industryMemory.brand_voice.formality_level 
      || 'professional',
    language_style: brandVoice.language_style?.length 
      ? brandVoice.language_style 
      : industryMemory.brand_voice.language_style || [],
    allow_emoji: brandVoice.allow_emoji ?? industryMemory.brand_voice.allow_emoji ?? true,
  };
}

const getBrandVoicePrompt = (voice: BrandVoice, mergedRules?: MergedRules): string => {
  const parts: string[] = [];
  
  if (mergedRules && mergedRules.forbidden_terms.length > 0) {
    parts.push(`## 🔒 INDUSTRY MEMORY (LUẬT CAO NHẤT - KHÔNG ĐƯỢC VI PHẠM)`);
    parts.push(`Industry Memory là LUẬT KHÓA CỨNG. Mọi nội dung PHẢI tuân theo.`);
    
    if (mergedRules.forbidden_terms.length > 0) {
      parts.push(`\n### ⛔ TỪ CẤM TUYỆT ĐỐI (Industry-level)`);
      parts.push(`Các từ sau KHÔNG BAO GIỜ được dùng:`);
      parts.push(mergedRules.forbidden_terms.join(", "));
    }
    
    if (mergedRules.compliance_rules.length > 0) {
      parts.push(`\n### 📜 QUY TẮC TUÂN THỦ NGÀNH`);
      mergedRules.compliance_rules.forEach((rule, i) => {
        parts.push(`${i + 1}. ${rule}`);
      });
    }
    
    if (mergedRules.claim_restrictions.length > 0) {
      parts.push(`\n### ⚠️ HẠN CHẾ TUYÊN BỐ`);
      mergedRules.claim_restrictions.forEach((claim) => {
        parts.push(`- KHÔNG ĐƯỢC: ${claim}`);
      });
    }
    
    parts.push(`\n### NGUYÊN TẮC INDUSTRY MEMORY`);
    parts.push(`1. Industry Memory OVERRIDE mọi yêu cầu khác nếu mâu thuẫn`);
    parts.push(`2. Không được "sáng tạo" từ nằm trong danh sách cấm`);
    parts.push(`3. Brand Voice có thể thay đổi tone, nhưng KHÔNG được vi phạm compliance`);
  }
  
  parts.push(`\n## BRAND VOICE PROFILE (LUẬT CAO NHẤT)`);
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi nội dung chữ trên slide PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  if (tones.length > 0) {
    const toneLabels = tones.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice: ${toneLabels}`);
  }
  
  const formality = mergedRules?.formality_level || voice.formality_level;
  if (formality) {
    const label = formalityLevelLabels[formality] || formality;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  const styles = mergedRules?.language_style || voice.language_style || [];
  if (styles.length > 0) {
    const styleLabels = styles.map(s => languageStyleLabels[s] || s).join(", ");
    parts.push(`\n### Phong cách ngôn ngữ: ${styleLabels}`);
  }
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE CHO CAROUSEL`);
  parts.push(`1. Nội dung chữ trên slide PHẢI đúng Tone of Voice`);
  parts.push(`2. Không được "sáng tạo giọng mới" - giữ nhất quán xuyên suốt carousel`);
  parts.push(`3. Caption và CTA cũng PHẢI đúng Brand Voice`);
  
  const preferredWords = mergedRules?.preferred_words || voice.preferred_words || [];
  if (preferredWords.length > 0) {
    parts.push(`\n### TỪ NÊN DÙNG trong nội dung carousel`);
    parts.push(preferredWords.join(", "));
  }
  
  const forbiddenWords = mergedRules?.forbidden_words || voice.forbidden_words || [];
  if (forbiddenWords.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG trong nội dung slide)`);
    parts.push(forbiddenWords.join(", "));
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

const getSystemPrompt = (formData: CarouselFormData, brandVoice?: BrandVoice, mergedRules?: MergedRules): string => {
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
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules) : "";

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

    // Note: AI calls now use the multi-provider system (ai-provider.ts)
    // which handles API key management internally

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

    // Load Brand Voice and Industry Memory from template if provided
    let brandVoice: BrandVoice | undefined;
    let industryMemory: IndustryMemory | null = null;
    let mergedRules: MergedRules | undefined;
    
    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id")
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
        
        // Load Industry Memory if brand has industry_template_id
        if (template.industry_template_id) {
          industryMemory = await fetchIndustryMemory(supabase, template.industry_template_id);
          if (industryMemory) {
            mergedRules = buildMergedRules(industryMemory, brandVoice);
            console.log("Industry Memory loaded:", industryMemory.name, "version:", industryMemory.version);
          }
        }
      }
    }

    // Initialize PromptManager and fetch prompts from registry
    let systemPrompt = getSystemPrompt(formData, brandVoice, mergedRules); // Fallback to hardcoded
    let userPrompt = `Tạo ${formData.slideCount} slide carousel cho chủ đề:
"${formData.topic}"

Nền tảng: ${formData.platform === "facebook" ? "Facebook" : "TikTok"}
Công cụ tạo ảnh: ${formData.aiTool}
Brand: ${formData.brandName}

Hãy tạo đầy đủ ${formData.slideCount} slides với format JSON theo tool definition.
Mỗi slide phải có nội dung tiếng Việt hấp dẫn, phù hợp với mục tiêu của slide đó.
Đảm bảo logic nội dung: Hook → Vấn đề → Giải thích → Giải pháp → CTA`;

    // Try to fetch prompts from registry
    try {
      const pm = createPromptManager(supabase, 'generate-carousel', organizationId || undefined, formData.brandTemplateId);
      const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules) : '';
      
      systemPrompt = await pm.get('system', {
        platform: formData.platform === "facebook" ? "Facebook" : "TikTok",
        aiTool: formData.aiTool,
        slideCount: String(formData.slideCount),
        brandName: formData.brandName,
        brandGuideline: formData.brandGuideline,
        includeLogo: formData.includeLogo ? 'true' : 'false',
        logoUrl: formData.logoUrl || '',
        brandVoiceSection,
      });
      
      userPrompt = await pm.get('generate', {
        topic: formData.topic,
        slideCount: String(formData.slideCount),
        platform: formData.platform === "facebook" ? "Facebook" : "TikTok",
        aiTool: formData.aiTool,
        brandName: formData.brandName,
      });
      
      console.log('[generate-carousel] Using prompts from registry');
    } catch (pmErr) {
      console.warn('[generate-carousel] PromptManager fallback to hardcoded:', pmErr);
    }

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

    // Get AI config from Admin Panel for model override
    const aiConfig = await getAIConfig('generate-carousel', organizationId || undefined);
    console.log('[generate-carousel] Using AI config:', { model: aiConfig.model, temperature: aiConfig.temperature });

    // Define AI generation function using multi-provider system
    const generateAIContent = async () => {
      console.log("Calling AI for carousel via multi-provider system...");
      
      const result = await callAIProvider({
        functionName: 'generate-carousel',
        organizationId: organizationId || undefined,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        toolChoice: { type: "function", function: { name: "generate_carousel_slides" } },
        modelOverride: aiConfig.model || undefined,
        temperatureOverride: aiConfig.temperature,
        maxTokensOverride: aiConfig.max_tokens,
      });

      if (!result.success) {
        console.error("AI Provider error:", result.error);
        
        if (result.error?.includes('Rate limit') || result.error?.includes('429')) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (result.error?.includes('Payment') || result.error?.includes('402')) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }
        throw new Error(`AI Provider error: ${result.error}`);
      }

      console.log('[generate-carousel] AI response from provider:', result.provider, 'model:', result.model);

      const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== "generate_carousel_slides") {
        throw new Error("Invalid AI response format");
      }

      return JSON.parse(toolCall.function.arguments);
    };

    // Use cache wrapper
    const functionName = 'generate-carousel';
    const scope = CACHE_SCOPE[functionName] || 'org';
    const ttlDays = CACHE_TTL[functionName] || 7;

    // Build cache input
    const cacheInput = {
      topic: formData.topic,
      platform: formData.platform,
      slideCount: formData.slideCount,
      aiTool: formData.aiTool,
      brandName: formData.brandName,
      brandVoice: brandVoice ? {
        positioning: brandVoice.brand_positioning,
        tone: brandVoice.tone_of_voice,
        formality: brandVoice.formality_level,
      } : null,
    };

    let generatedData: any;
    let fromCache = false;

    try {
      const cacheResult = await withCache({
        functionName,
        scope,
        organizationId: organizationId || undefined,
        brandTemplateId: formData.brandTemplateId,
        input: cacheInput,
        versions: {
          industryMemory: industryMemory?.version,
          brandVoice: brandVoice?.formality_level || undefined,
        },
        ttlDays,
        generateFn: generateAIContent,
      });

      generatedData = cacheResult.data;
      fromCache = cacheResult.fromCache;
      console.log(`Carousel generation: ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}`);
    } catch (err: any) {
      if (err.status === 429) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err.status === 402) {
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

    console.log("Generated carousel:", generatedData.title);

    // ============================================
    // SELF-CRITIQUE LOOP - Evaluate and refine carousel
    // ============================================
    let critiqueResult: CritiqueResult | null = null;
    let wasRefined = false;
    let refinementCount = 0;

    // Only run critique if not from cache
    if (!fromCache) {
      try {
        const critiqueLoop = await runSelfCritiqueLoop({
          content: generatedData,
          contentType: 'carousel',
          brandVoice,
          mergedRules,
          additionalContext: `Platform: ${formData.platform}, Slides: ${formData.slideCount}, AI Tool: ${formData.aiTool}`,
          apiKey: Deno.env.get("LOVABLE_API_KEY") || '',
          organizationId: organizationId || undefined,
        });

        generatedData = critiqueLoop.finalContent;
        critiqueResult = critiqueLoop.critiqueResult;
        wasRefined = critiqueLoop.wasRefined;
        refinementCount = critiqueLoop.refinementCount;

        console.log(`Self-Critique complete: score=${critiqueResult.overall_score}, refined=${wasRefined}`);
      } catch (critiqueError) {
        console.error("Self-critique failed, using original content:", critiqueError);
        // Continue with original content if critique fails
      }
    }

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
        industry_template_id: industryMemory?.id || null,
        industry_template_version: industryMemory?.version || null,
        campaign_id: formData.campaignId || null,
        // Self-critique metadata
        critique_score: critiqueResult?.overall_score || null,
        critique_details: critiqueResult || null,
        was_refined: wasRefined,
        refinement_count: refinementCount,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save carousel");
    }

    console.log("Carousel saved with ID:", carousel.id, "fromCache:", fromCache, "critiqueScore:", critiqueResult?.overall_score || 'N/A');

    // ============ SAVE AI METRICS WITH COST ============
    if (!fromCache) {
      try {
        const model = 'google/gemini-2.5-flash';
        const inputTokensEstimated = 2500; // System prompt + brand context
        const outputTokensEstimated = formData.slideCount * 400; // ~400 tokens per slide
        const estimatedCostUsd = estimateCost(model, inputTokensEstimated, outputTokensEstimated);
        
        await saveMetrics(supabase, {
          traceId: generateTraceId(),
          functionName: 'generate-carousel',
          organizationId: organizationId || undefined,
          userId: userId || undefined,
          brandTemplateId: formData.brandTemplateId || undefined,
          totalDurationMs: 0,
          inputTokensEstimated,
          outputTokensEstimated,
          modelsUsed: { default: model },
          estimatedCostUsd,
          hadError: false,
          cacheHit: false,
          contextSources: [],
        });
        console.log(`[generate-carousel] Metrics saved: cost=$${estimatedCostUsd.toFixed(6)}`);
      } catch (metricsErr) {
        console.warn(`[generate-carousel] Failed to save metrics:`, metricsErr);
      }
    }

    return new Response(JSON.stringify({ ...carousel, fromCache }), {
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