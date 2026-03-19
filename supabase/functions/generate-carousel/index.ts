import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import {
  runSelfCritiqueLoop,
  CRITIQUE_CONFIG,
  type CritiqueResult,
} from "../_shared/self-critique.ts";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager, buildPrompt } from "../_shared/prompt-integration.ts";
import { getOutputLanguage, getLanguageConfig, buildLocalizedDateContext, type LanguageConfig } from "../_shared/country-language-map.ts";

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
  carouselStyle?: "seamless" | "educational" | "listicle" | "gallery";
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

// Brand Voice label mappings (multi-language)
const brandPositioningLabelsMap: Record<string, Record<string, string>> = {
  vi: { business: "Doanh nghiệp", expert: "Chuyên gia", agency: "Agency", consultant: "Tư vấn" },
  th: { business: "ธุรกิจ", expert: "ผู้เชี่ยวชาญ", agency: "เอเจนซี่", consultant: "ที่ปรึกษา" },
  en: { business: "Business", expert: "Expert", agency: "Agency", consultant: "Consultant" },
};

const toneOfVoiceLabelsMap: Record<string, Record<string, string>> = {
  vi: { expert: "Chuyên gia", calm: "Điềm tĩnh", confident: "Tự tin", friendly: "Thân thiện", analytical: "Phân tích", serious: "Nghiêm túc", inspirational: "Truyền cảm hứng" },
  th: { expert: "เชี่ยวชาญ", calm: "สงบ", confident: "มั่นใจ", friendly: "เป็นมิตร", analytical: "วิเคราะห์", serious: "จริงจัง", inspirational: "สร้างแรงบันดาลใจ" },
  en: { expert: "Expert", calm: "Calm", confident: "Confident", friendly: "Friendly", analytical: "Analytical", serious: "Serious", inspirational: "Inspirational" },
};

const formalityLevelLabelsMap: Record<string, Record<string, string>> = {
  vi: { very_formal: "Rất trang trọng", professional: "Chuyên nghiệp", neutral: "Trung lập", casual: "Gần gũi" },
  th: { very_formal: "ทางการมาก", professional: "มืออาชีพ", neutral: "กลางๆ", casual: "เป็นกันเอง" },
  en: { very_formal: "Very Formal", professional: "Professional", neutral: "Neutral", casual: "Casual" },
};

const languageStyleLabelsMap: Record<string, Record<string, string>> = {
  vi: { clear_direct: "Rõ ràng, trực tiếp", structured: "Có cấu trúc", no_exaggeration: "Không khoa trương", no_over_emotion: "Không cảm tính quá mức" },
  th: { clear_direct: "ชัดเจน ตรงประเด็น", structured: "มีโครงสร้าง", no_exaggeration: "ไม่เกินจริง", no_over_emotion: "ไม่อารมณ์มากเกินไป" },
  en: { clear_direct: "Clear and Direct", structured: "Structured", no_exaggeration: "No Exaggeration", no_over_emotion: "No Over-emotion" },
};

// Helper to get labels for a language
function getLabels(lang: string) {
  const l = lang || 'vi';
  return {
    brandPositioning: brandPositioningLabelsMap[l] || brandPositioningLabelsMap['en'],
    toneOfVoice: toneOfVoiceLabelsMap[l] || toneOfVoiceLabelsMap['en'],
    formalityLevel: formalityLevelLabelsMap[l] || formalityLevelLabelsMap['en'],
    languageStyle: languageStyleLabelsMap[l] || languageStyleLabelsMap['en'],
  };
}

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

const getBrandVoicePrompt = (voice: BrandVoice, mergedRules?: MergedRules, outputLang: string = 'vi'): string => {
  const labels = getLabels(outputLang);
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
    const label = labels.brandPositioning[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  if (tones.length > 0) {
    const toneLabels = tones.map(t => labels.toneOfVoice[t] || t).join(", ");
    parts.push(`\n### Tone of Voice: ${toneLabels}`);
  }
  
  const formality = mergedRules?.formality_level || voice.formality_level;
  if (formality) {
    const label = labels.formalityLevel[formality] || formality;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  const styles = mergedRules?.language_style || voice.language_style || [];
  if (styles.length > 0) {
    const styleLabels = styles.map(s => labels.languageStyle[s] || s).join(", ");
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

const getSlideObjective = (slideNumber: number, totalSlides: number, lang: string = 'vi', style: string = 'educational'): string => {
  const objectives: Record<string, Record<string, string>> = {
    vi: { hook: "Hook - Gây sốc, tò mò, thu hút người xem dừng lại", problem: "Nêu vấn đề - Khơi gợi pain point của người đọc", explain: "Giải thích - Phân tích sâu hơn về vấn đề", explain2: "Giải thích tiếp - Bổ sung thông tin quan trọng", solution: "Giải pháp / Lời khuyên chuyên gia", cta: "CTA - Kêu gọi hành động, tạo tương tác", impact: "Hậu quả / Lợi ích - Nhấn mạnh tầm quan trọng", seamless_fragment: "Phân đoạn liên tục - Phần tử nối liền từ slide trước", listicle_item: "Điểm danh sách - 1 item nổi bật", gallery_photo: "Ảnh bộ sưu tập - Visual chủ đề" },
    th: { hook: "Hook - สร้างความตกใจ อยากรู้ ดึงดูดให้หยุดเลื่อน", problem: "ปัญหา - กระตุ้น Pain Point ของผู้อ่าน", explain: "อธิบาย - วิเคราะห์ปัญหาเชิงลึก", explain2: "อธิบายต่อ - เพิ่มข้อมูลสำคัญ", solution: "ทางออก / คำแนะนำจากผู้เชี่ยวชาญ", cta: "CTA - เรียกร้องให้ดำเนินการ สร้างการมีส่วนร่วม", impact: "ผลกระทบ / ประโยชน์ - เน้นย้ำความสำคัญ", seamless_fragment: "ส่วนต่อเนื่อง", listicle_item: "รายการ", gallery_photo: "ภาพคอลเลกชัน" },
    en: { hook: "Hook - Shock, curiosity, stop the scroll", problem: "Problem - Trigger reader's pain point", explain: "Explain - Deeper analysis of the problem", explain2: "Explain further - Add important information", solution: "Solution / Expert advice", cta: "CTA - Call to action, drive engagement", impact: "Impact / Benefits - Emphasize importance", seamless_fragment: "Continuous fragment - elements bridge from previous slide", listicle_item: "List item - One standout point", gallery_photo: "Gallery photo - Themed visual" },
  };
  const o = objectives[lang] || objectives['en'];

  // Style-specific objective mapping
  if (style === 'seamless') {
    if (slideNumber === 1) return o.hook;
    if (slideNumber === totalSlides) return o.cta;
    return o.seamless_fragment;
  }
  if (style === 'listicle') {
    if (slideNumber === 1) return o.hook;
    if (slideNumber === totalSlides) return o.cta;
    return `${o.listicle_item} #${slideNumber - 1}`;
  }
  if (style === 'gallery') {
    if (slideNumber === 1) return o.hook;
    if (slideNumber === totalSlides) return o.cta;
    return o.gallery_photo;
  }

  // Default: educational
  if (slideNumber === 1) return o.hook;
  if (slideNumber === 2) return o.problem;
  if (slideNumber === 3) return o.explain;
  if (slideNumber === 4) return o.explain2;
  if (slideNumber === totalSlides - 1) return o.solution;
  if (slideNumber === totalSlides) return o.cta;
  return o.impact;
};

const getCarouselStylePrompt = (style: string, slideCount: number): string => {
  switch (style) {
    case 'seamless':
      return `
## CAROUSEL STYLE: SEAMLESS / CONTINUOUS (Trượt liền mạch)
CRITICAL DESIGN RULES:
- Tất cả ${slideCount} slides tạo thành MỘT bức tranh dài liền mạch
- Các phần tử (hình khối, mũi tên, đường kẻ, gradient) PHẢI vắt ngang qua biên trái/phải của mỗi slide
- Sử dụng CÙNG MỘT palette màu xuyên suốt tất cả slides
- Background phải chuyển tiếp mượt mà giữa các slides
- Mỗi slide là một FRAGMENT của bức tranh lớn
- Text content ngắn gọn, đặt ở vị trí không cắt ngang biên
- Slide 1: Hook mở đầu câu chuyện
- Slide ${slideCount}: CTA kết thúc
- Các slide giữa: Mỗi slide tiếp nối visual từ slide trước

PROMPT HƯỚNG DẪN CHO MỖI SLIDE:
- Yêu cầu "elements extending to left and right edges"
- Yêu cầu "consistent color palette and visual motif across all slides"
- Yêu cầu "seamless transition: left edge continues from previous slide, right edge leads to next"
`;
    case 'listicle':
      return `
## CAROUSEL STYLE: LISTICLE / TOP-LIST (Trượt dạng danh sách)
CRITICAL DESIGN RULES:
- Slide 1: Tiêu đề gây tò mò kiểu "Top ${slideCount - 2} điều..." hoặc "${slideCount - 2} bí quyết..."
- Slides 2 đến ${slideCount - 1}: Mỗi slide = ĐÚNG 1 item được đánh số lớn (#1, #2, ...)
- Slide ${slideCount}: CTA tổng kết
- Layout ĐỒNG NHẤT cho tất cả slides item (cùng vị trí số, cùng font size, cùng bố cục)
- Số thứ tự phải LỚN và NỔI BẬT (kiểu typography)
- Mỗi item có: Số + Tiêu đề ngắn + Mô tả 1-2 dòng
- Visual weight phải BẰNG NHAU giữa các slides
`;
    case 'gallery':
      return `
## CAROUSEL STYLE: PHOTO DUMP / GALLERY (Bộ sưu tập ảnh)
CRITICAL DESIGN RULES:
- Focus 100% vào VISUAL QUALITY - ảnh đẹp là ưu tiên số 1
- MINIMAL TEXT trên ảnh - chỉ slide 1 có tiêu đề, slide cuối có CTA
- Slides giữa: Background-only, ảnh thực tế hoặc ảnh nghệ thuật
- KHÔNG cần thiết kế cầu kỳ, layout overlay hay infographic
- Prompt ảnh phải mô tả chi tiết về: lighting, mood, composition, subject
- Mỗi slide là một góc nhìn khác của cùng chủ đề
- textContent cho slides giữa nên để rất ngắn hoặc chỉ 1 câu tagline
`;
    case 'educational':
    default:
      return `
## CAROUSEL STYLE: EDUCATIONAL / STEP-BY-STEP (Giáo dục theo bước)
LOGIC NỘI DUNG:
- Slide 1: HOOK - Gây sốc, tò mò (câu statement mạnh, số liệu gây sốc)
- Slide 2: NÊU VẤN ĐỀ - Khơi gợi pain point
- Slide 3-${Math.floor(slideCount * 0.6)}: GIẢI THÍCH - Chi tiết vấn đề
- Slide ${Math.floor(slideCount * 0.7)}-${slideCount - 1}: HẬU QUẢ/LỢI ÍCH + GIẢI PHÁP
- Slide ${slideCount}: CTA - Kêu gọi hành động
- Mỗi slide có thể có progress indicator (Bước 1/6, Bước 2/6...)
- Phong cách kể chuyện, xây dựng logic dần dần
`;
  }
};

const getSystemPrompt = (formData: CarouselFormData, brandVoice?: BrandVoice, mergedRules?: MergedRules, outputLang: string = 'vi'): string => {
  const langConfig = getLanguageConfig(outputLang);
  const carouselStyle = formData.carouselStyle || 'educational';

  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules, outputLang) : "";
  const langName = langConfig.nativeName;
  const styleSection = getCarouselStylePrompt(carouselStyle, formData.slideCount);

  return `You are a professional Content Strategist for social media, specialized in creating carousels for ${formData.platform === "facebook" ? "Facebook" : "TikTok"}.
Output ALL content in ${langName} (${langConfig.englishName}).

${brandVoiceSection}

## VAI TRÒ CỦA BẠN
1. Viết Prompt tạo ảnh chuyên nghiệp cho ${formData.aiTool}
2. Tư duy như Content Strategist - chia nội dung theo nhịp đọc mạng xã hội
3. Chuẩn hóa đầu ra theo format 6 thành phần bắt buộc

${styleSection}

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

    // Get user from auth header using getClaims (signing-keys compatible)
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (!claimsError && data?.claims?.sub) {
        userId = data.claims.sub as string;
      }
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
    let outputLang = 'vi'; // Default to Vietnamese for backward compatibility
    
    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id, country_code")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        // Extract output language from brand's country_code
        outputLang = getOutputLanguage(template.country_code);
        console.log("Output language:", outputLang, "from country_code:", template.country_code);
        
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
          industryMemory = await fetchIndustryMemory(supabase, template.industry_template_id, outputLang);
          if (industryMemory) {
            mergedRules = buildMergedRules(industryMemory, brandVoice);
            console.log("Industry Memory loaded:", industryMemory.name, "version:", industryMemory.version);
          }
        }
      }
    }

    const langConfig = getLanguageConfig(outputLang);

    // Initialize PromptManager and fetch prompts from registry
    let systemPrompt = getSystemPrompt(formData, brandVoice, mergedRules, outputLang); // Fallback to hardcoded
    let userPrompt = `Create ${formData.slideCount} carousel slides for the topic:
"${formData.topic}"

Platform: ${formData.platform === "facebook" ? "Facebook" : "TikTok"}
Carousel Style: ${formData.carouselStyle || 'educational'}
Brand: ${formData.brandName}
Output Language: ${langConfig.nativeName} (${langConfig.englishName})

Generate all ${formData.slideCount} slides in JSON format as defined by the tool.
Each slide must have compelling text content in ${langConfig.nativeName}.
Remember: fullPrompt is for BACKGROUND IMAGE only (no text rendering needed).
Follow the carousel style guidelines strictly.`;

    // Try to fetch prompts from registry
    try {
      const pm = createPromptManager(supabase, 'generate-carousel', organizationId || undefined, formData.brandTemplateId);
      const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules, outputLang) : '';
      
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
      console.log("Calling AI for carousel via callAIWithMetrics...");
      
      const result = await callAIWithMetrics(supabase, {
        functionName: 'generate-carousel',
        organizationId: organizationId || undefined,
        userId: userId || undefined,
        brandTemplateId: formData.brandTemplateId || undefined,
        actionType: 'generate',
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
          throw { status: 429, message: "Rate limit exceeded. Please try again later." };
        }
        if (result.error?.includes('Payment') || result.error?.includes('402')) {
          throw { status: 402, message: "Insufficient credits. Please add more to continue." };
        }
        throw new Error(`AI Provider error: ${result.error}`);
      }

      console.log('[generate-carousel] AI response from provider:', result.provider, 'model:', result.model, 
        'cost:', result.metrics ? `$${result.metrics.estimatedCostUsd.toFixed(6)}` : 'N/A');

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
        carousel_style: formData.carouselStyle || 'educational',
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

    // Metrics are now automatically saved by callAIWithMetrics() 
    // No manual metrics block needed

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