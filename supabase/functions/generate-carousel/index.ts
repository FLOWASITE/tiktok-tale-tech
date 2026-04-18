import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { hashComplianceRules } from "../_shared/cache/compliance-hash.ts";
import {
  runSelfCritiqueLoop,
  CRITIQUE_CONFIG,
  type CritiqueResult,
} from "../_shared/self-critique.ts";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager, buildPrompt } from "../_shared/prompt-integration.ts";
import { getOutputLanguage, getLanguageConfig, getCountryConfig, buildLocalizedDateContext, type LanguageConfig } from "../_shared/country-language-map.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CarouselFormData {
  topic: string;
  platform: "facebook" | "tiktok" | "instagram" | "linkedin";
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
  visualPreset?: "minimalist" | "flat_design" | "gradient" | "geometric" | "illustration" | "product_only";
}

interface StructuredTextContent {
  headline: string;
  subtitle?: string;
  caption?: string;
  dataValue?: string;
  dataLabel?: string;
}

interface CarouselSlide {
  slideNumber: number;
  objective: string;
  textContent: string | StructuredTextContent;
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

/**
 * Strict post-repair validator. JSON repair can yield slides that are
 * schema-valid but semantically empty (e.g. fullPrompt:"", missing headline,
 * non-contiguous slideNumber). Caching such garbage = persistent UX failure
 * and, in regulated verticals, compliance risk. This guard refuses them.
 */
function validateRepairedSlides(
  slides: unknown,
  expectedCount: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(slides)) {
    return { valid: false, errors: ['slides is not an array'] };
  }
  if (slides.length !== expectedCount) {
    errors.push(`expected ${expectedCount} slides, got ${slides.length}`);
  }
  const seenNumbers = new Set<number>();
  slides.forEach((slide: any, idx: number) => {
    const expectedNum = idx + 1;
    const num = slide?.slideNumber;
    if (num !== expectedNum) {
      errors.push(`slide[${idx}]: slideNumber=${num}, expected ${expectedNum}`);
    }
    if (typeof num === 'number') {
      if (seenNumbers.has(num)) errors.push(`duplicate slideNumber ${num}`);
      seenNumbers.add(num);
    }
    // headline check (string textContent OR structured.headline)
    const tc = slide?.textContent;
    let headlineOk = false;
    if (typeof tc === 'string') {
      headlineOk = tc.trim().length > 0;
    } else if (tc && typeof tc === 'object') {
      headlineOk = typeof tc.headline === 'string' && tc.headline.trim().length > 0;
    }
    if (!headlineOk) {
      errors.push(`slide ${expectedNum}: empty/missing headline`);
    }
    // fullPrompt: must be ≥30 words
    const fp = typeof slide?.fullPrompt === 'string' ? slide.fullPrompt.trim() : '';
    const wordCount = fp ? fp.split(/\s+/).length : 0;
    if (wordCount < 30) {
      errors.push(`slide ${expectedNum}: fullPrompt has ${wordCount} words (<30)`);
    }
  });
  return { valid: errors.length === 0, errors };
}

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

// ============================================
// Phase 6: Text Length Guidelines per Visual Preset
// ============================================
const getTextLengthGuidelines = (visualPreset: string): string => {
  const guidelines: Record<string, string> = {
    minimalist: `
## TEXT LENGTH CONSTRAINTS (Clean Modern — lots of whitespace, negative space 40-50%)
- textContent line 1 (headline): Maximum 5 words. Short, quiet, impactful.
- textContent line 2 (subtitle): Maximum 10 words or leave empty.
- Total text per slide MUST NOT exceed 20 words.
- Prioritize whitespace over content density.`,

    flat_design: `
## TEXT LENGTH CONSTRAINTS (Bold Infographic — large text, high visual impact)
- textContent line 1 (headline): Maximum 6 words, UPPERCASE preferred.
- Use numbers/statistics prominently when relevant (e.g., "2.5M", "340%").
- textContent line 2 (subtitle): Maximum 12 words.
- Keep data-focused: numbers > paragraphs.`,

    gradient: `
## TEXT LENGTH CONSTRAINTS (Gradient Flow — text in glass card container)
- textContent line 1 (headline): Maximum 7 words.
- textContent line 2 (subtitle): Maximum 15 words.
- Text sits inside a glass card overlay — keep concise so card stays compact.`,

    geometric: `
## TEXT LENGTH CONSTRAINTS (Corporate — text only occupies left column ~55%)
- textContent line 1 (headline): Maximum 5 words. Professional, no fluff.
- textContent line 2 (subtitle): Maximum 12 words.
- Right side is reserved for visuals — text MUST be short.`,

    illustration: `
## TEXT LENGTH CONSTRAINTS (Story Visual — flexible artistic layout)
- textContent line 1 (headline): Maximum 7 words, emotional language encouraged.
- textContent line 2 (subtitle): Maximum 12 words.
- Handwriting-style font works best with shorter text.`,

    product_only: `
## TEXT LENGTH CONSTRAINTS (Product Focus — split layout with product image)
- textContent line 1 (headline): Maximum 5 words — product name or USP.
- textContent line 2 (subtitle): Maximum 8 words — one standout feature.
- Keep minimal — product image is the hero.`,
  };

  return guidelines[visualPreset] || guidelines.minimalist;
};

const getSystemPrompt = (formData: CarouselFormData, brandVoice?: BrandVoice, mergedRules?: MergedRules, outputLang: string = 'vi', countryCode?: string | null, brandColors?: { primary?: string; secondary?: string[] }): string => {
  const langConfig = getLanguageConfig(outputLang);
  const countryConfig = getCountryConfig(countryCode);
  const carouselStyle = formData.carouselStyle || 'educational';
  const visualPreset = formData.visualPreset || 'minimalist';

  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules, outputLang) : "";
  const langName = langConfig.nativeName;
  const styleSection = getCarouselStylePrompt(carouselStyle, formData.slideCount);
  const textLengthSection = getTextLengthGuidelines(visualPreset);

  // Brand color directive for BOTH colorLayout AND fullPrompt
  let brandColorDirective = '';
  if (brandColors?.primary) {
    const allColors = [brandColors.primary, ...(brandColors.secondary || [])].join(', ');
    const primaryHex = brandColors.primary;
    brandColorDirective = `\n## 🎨 BRAND COLOR PALETTE — BẮT BUỘC CHO CẢ colorLayout VÀ fullPrompt
Thương hiệu sử dụng palette: ${allColors}

### QUY TẮC colorLayout (CRITICAL):
- colorLayout PHẢI BẮT ĐẦU bằng brand hex codes: ${allColors}
- Ví dụ đúng: "Brand ${primaryHex}, complementary #FFF5E6. Centered layout with high contrast."
- Ví dụ SAI: "Deep blue (#0A2540), electric teal (#00D4FF)" — TUYỆT ĐỐI KHÔNG tự chọn màu ngoài palette
- Nếu cần màu bổ sung, chỉ dùng tints/shades của brand colors (lighten/darken ${primaryHex})

### QUY TẮC fullPrompt (CRITICAL):
- fullPrompt PHẢI dùng brand palette làm COLOR PALETTE CHÍNH (không chỉ accent)
- Ghi rõ: "color palette: ${allColors}" trong mọi fullPrompt
- Background, gradient, shapes, overlays đều PHẢI dựa trên ${allColors}
- KHÔNG được dùng "deep blue", "navy", "teal", "electric blue" hay bất kỳ màu nào ngoài brand palette\n`;
  }

  const platformName: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn' };
  return `You are a professional Content Strategist for social media, specialized in creating carousels for ${platformName[formData.platform] || 'Facebook'}.
Output ALL content in ${langName} (${langConfig.englishName}).

${brandVoiceSection}
${brandColorDirective}

## VAI TRÒ CỦA BẠN
1. Viết nội dung carousel chuyên nghiệp (textContent cho mỗi slide)
2. Viết Prompt tạo ẢNH NỀN (background image) cho mỗi slide
3. Tư duy như Content Strategist - chia nội dung theo nhịp đọc mạng xã hội
4. Chuẩn hóa đầu ra theo format 7 thành phần bắt buộc

${styleSection}

## BRAND GUIDELINE BẮT BUỘC
${formData.brandGuideline}

Brand name: ${formData.brandName}
${formData.includeLogo ? `Logo: Bao gồm logo "${formData.brandName}" ở góc dưới, subtle và professional.${formData.logoUrl ? `\nLogo URL (reference): ${formData.logoUrl}` : ""}` : "Không có logo."}

## NGUYÊN TẮC QUAN TRỌNG VỀ fullPrompt

fullPrompt là prompt để tạo ẢNH HOÀN CHỈNH cho slide — bao gồm CẢ background VÀ layout tổng thể.
Text sẽ được thêm tự động bởi hệ thống — bạn KHÔNG cần viết text content trong fullPrompt.

### LUẬT:
1. fullPrompt mô tả CẢNH CỤ THỂ liên quan đến NỘI DUNG slide (không chung chung)
2. fullPrompt KHÔNG chứa nội dung text — hệ thống sẽ tự thêm text từ textContent
3. Tất cả slides phải CÙNG thế giới hình ảnh (cùng setting, palette, phong cách, ánh sáng)
4. fullPrompt tối thiểu 30 từ tiếng Anh
5. fullPrompt phải bao gồm: [chủ thể] + [bối cảnh] + [ánh sáng] + [phong cách] + [palette] + [mood]
6. Mỗi fullPrompt KẾT THÚC bằng: "consistent with previous slides: [mô tả phong cách chung]"
7. Phải để lại KHÔNG GIAN cho text overlay — ảnh không nên quá chi tiết/busy ở vùng text sẽ xuất hiện

### VÍ DỤ TỐT:
Topic: "5 Tips Marketing cho Spa"
- Slide 1 (Hook): "Overhead view of luxury spa treatment room, white marble with orchid flowers, essential oil bottles, warm golden candlelight, steam rising, shallow depth of field, editorial photography, muted purple and gold palette, generous clean space in center for text overlay, consistent with series: luxury spa environment"
- Slide 2: "Close-up of hot stone massage, warm amber lighting, smooth stones in line, eucalyptus leaves blurred in background, same luxury spa, same purple-gold palette, clean area on left side for text, consistent with previous slides: same spa photography style"

### VÍ DỤ XẤU (KHÔNG LÀM):
- "Modern gradient background with soft colors" ← quá chung, không liên quan topic
- "Abstract shapes representing digital transformation" ← trừu tượng, không có cảnh cụ thể
- "Beautiful spa image" ← quá ngắn, không chi tiết

## QUY TẮC THỐNG NHẤT HÌNH ẢNH (ÁP DỤNG CHO TẤT CẢ CAROUSEL STYLES)

Tất cả slides trong 1 carousel PHẢI tuân theo quy tắc thống nhất sau:

1. CÙNG PHONG CÁCH HÌNH ẢNH: Nếu slide 1 dùng photography → tất cả slides dùng photography. Nếu slide 1 dùng illustration → tất cả dùng illustration. KHÔNG MIX.

2. CÙNG PALETTE MÀU: Xác định 3-4 màu chủ đạo từ slide đầu tiên, tất cả slides còn lại PHẢI sử dụng đúng palette đó. Ghi rõ palette vào mỗi fullPrompt (ví dụ: "navy blue and gold color palette" phải xuất hiện trong MỌI fullPrompt).

3. CÙNG SETTING/THẾ GIỚI: Tất cả slides diễn ra trong cùng 1 "thế giới". Ví dụ: nếu topic về spa, tất cả slides đều trong cùng spa đó (không nhảy sang văn phòng hay ngoài trời). Nếu topic về công nghệ, tất cả trong cùng office/lab.

4. CÙNG ÁNH SÁNG VÀ MOOD: Warm lighting xuyên suốt, hoặc cool lighting xuyên suốt. Không slide warm slide cool.

5. MỖI fullPrompt PHẢI KẾT THÚC bằng cụm: "consistent with previous slides: [phong cách chung]. THIS SLIDE UNIQUE ELEMENT: [yếu tố riêng biệt của slide này]"

## QUY TẮC PHÂN BIỆT GIỮA CÁC SLIDE (QUAN TRỌNG NHƯ QUY TẮC THỐNG NHẤT)

Mặc dù tất cả slides cùng "thế giới hình ảnh", MỖI SLIDE PHẢI CÓ:

1. GÓC CHỤP KHÁC NHAU: wide shot → medium → close-up → overhead → side angle. KHÔNG được 2 slide liền nhau có cùng camera angle.

2. CHỦ THỂ/FOCAL POINT KHÁC NHAU: Mỗi slide focus vào 1 yếu tố khác trong cùng thế giới. VD spa: slide 1 = toàn cảnh phòng, slide 2 = close-up đá nóng, slide 3 = tay massage, slide 4 = sản phẩm tinh dầu.

3. BỐ CỤC KHÁC NHAU: Xen kẽ rule of thirds, centered, asymmetric, negative space left/right. Không 2 slide cùng bố cục.

4. KHOẢNG CÁCH KHÁC NHAU: Xen kẽ establishing shot, medium shot, detail/macro shot để tạo nhịp thị giác.

5. Trong fullPrompt, CHỈ RÕ: "[camera angle] + [focal subject] + [composition]" ĐẦU TIÊN, trước phần mô tả chi tiết.

VÍ DỤ TỐT (Topic: "5 Tips Marketing cho Spa"):
- Slide 1: "Wide establishing shot of luxury spa reception, rule of thirds..."
- Slide 2: "Close-up overhead view of essential oil bottles on marble tray..."
- Slide 3: "Medium shot from side angle, therapist hands performing massage..."
- Slide 4: "Detail macro shot of hot stones arranged on wooden board..."
- Slide 5: "Wide low-angle shot of spa garden pathway with lanterns..."

VÍ DỤ XẤU (tất cả lặp lại):
- Slide 1: "Spa treatment room with candles..."
- Slide 2: "Spa treatment area with oils..."
- Slide 3: "Spa massage room with stones..."

## PEOPLE & CHARACTER LOCALIZATION (CRITICAL)
If any slide includes people, characters, or human figures in the fullPrompt:
- They MUST match the brand's target market: ${countryConfig.englishName}.
- Describe people as "${countryConfig.englishName} people" or use ethnicity-appropriate descriptions.
- Example: If brand is from Vietnam → "Vietnamese woman in her 30s", NOT "Caucasian woman".
- Example: If brand is from Thailand → "Thai businessman", NOT generic "Asian man".
- This applies to ALL human figures: customers, professionals, models, hands, etc.
- If no people are needed, this rule does not apply — do NOT force people into scenes.

${textLengthSection}

## NGUYÊN TẮC VIẾT NỘI DUNG
1. textContent: Nội dung chữ sẽ được render lên ảnh, viết ngắn gọn, dễ đọc trên mobile
2. fullPrompt: Prompt tạo ảnh slide — mô tả CẢNH cụ thể, KHÔNG viết text content trong đây
3. Font: Sans-serif, ít chữ, dòng ngắn, khoảng trắng nhiều
4. Carousel là để ĐỌC - ảnh hỗ trợ visual và render text
5. PHẢI tuân thủ TEXT LENGTH CONSTRAINTS ở trên — text quá dài sẽ bị tràn visual space

## NGUYÊN TẮC VIẾT CAPTION & CTA (CHUẨN MARKETING)

### CAPTION — Công thức HOOK-BODY-CTA-HASHTAG:
1. HOOK LINE (dòng đầu tiên):
   - PHẢI gây TÒ MÒ hoặc SHOCK — khiến người đọc nhấn "Xem thêm"
   - Dưới 125 ký tự (Facebook cắt sau 125 ký tự trên mobile)
   - Kỹ thuật: câu hỏi gây tranh cãi, số liệu gây sốc, statement ngược đời, "Đừng...", "Sai lầm...", "X% người không biết..."

2. BODY (2-4 dòng):
   - Mỗi dòng 1 ý, dùng emoji đầu dòng (✅ 📌 💡 🔥 ⚡ 🎯)
   - Tạo nhịp đọc bằng line breaks
   - Tóm tắt giá trị carousel mang lại — tại sao nên xem hết?

3. CTA LINE:
   - Kêu gọi hành động cụ thể: 💾 Save lại, ↗️ Share cho bạn bè, 💬 Comment ý kiến
   - Hoặc câu hỏi mở kéo tương tác

4. HASHTAGS:
   - Facebook: 3-5 hashtags (ít, targeted, liên quan trực tiếp)
   - Instagram: 5-10 hashtags (mix trending + niche + branded + community)
   - TikTok: 5-8 hashtags (mix trending + niche + branded)
   - LinkedIn: 3-5 hashtags (professional, industry-specific)
   - Hashtags phải viết liền, không dấu cách: #ContentMarketing #MẹoKinhDoanh

### CTA SUGGESTION — Công thức đa tầng:
Viết 3 dòng CTA alternatives, mỗi dòng có label rõ ràng:
1. 🎯 CTA chính: Hành động trực tiếp ("💾 Save ngay để áp dụng khi cần!")
2. 💬 Engagement: Câu hỏi mở kéo comment ("Bạn đã thử tip nào rồi? Comment cho mình biết!")
3. 👥 Share: Lý do chia sẻ + tag ("Tag ngay người bạn đang cần biết điều này 👇")

Nền tảng ${formData.platform === 'tiktok' ? 'TikTok — ưu tiên ngôn ngữ Gen Z, trend-driven, dùng "Follow để xem thêm"' : formData.platform === 'instagram' ? 'Instagram — ưu tiên visual storytelling, aesthetic, dùng "Save & Share"' : formData.platform === 'linkedin' ? 'LinkedIn — ưu tiên professional insights, thought leadership, dùng ngôn ngữ chuyên nghiệp' : 'Facebook — ưu tiên storytelling, community, dùng "Save/Share bài viết"'}.

## FORMAT OUTPUT BẮT BUỘC CHO MỖI SLIDE
Bạn PHẢI trả về JSON với cấu trúc chính xác như tool definition.
Mỗi slide phải có đủ 7 thành phần:
[1] objective: Mục tiêu slide
[2] textContent: Object có cấu trúc phân tầng (${langName}):
    - headline (BẮT BUỘC): Dòng chính — ngắn gọn, 3-8 từ
    - subtitle (tùy chọn): Dòng phụ — 1-2 câu ngắn
    - caption (tùy chọn): Dòng nhỏ — tagline/CTA ngắn, ví dụ "@flowa.vn"
    - dataValue (chỉ cho data slides): Số liệu lớn — "150%", "2.5M"
    - dataLabel (đi kèm dataValue): Nhãn — "Tăng trưởng doanh thu"
[3] designStyle: Phong cách thiết kế
[4] colorLayout: Màu sắc – bố cục (PHẢI dùng brand colors hex làm màu chủ đạo, KHÔNG tự chọn màu khác)
[5] aspectRatio: Tỉ lệ khung hình (1:1 cho carousel)
[6] technicalRequirements: Yêu cầu kỹ thuật
[7] fullPrompt: Prompt tạo ẢNH SLIDE (mô tả cảnh cụ thể, KHÔNG viết text content, để lại không gian cho text)

## VÍ DỤ textContent
Hook slide: { "headline": "AI ĐÃ THAY ĐỔI MARKETING", "subtitle": "3 chiến lược bạn cần biết ngay", "caption": "@flowa.vn" }
Data slide: { "headline": "Hiệu quả quảng cáo", "dataValue": "340%", "dataLabel": "ROI trung bình", "caption": "Khảo sát Q3/2025" }
CTA slide: { "headline": "Bắt đầu ngay hôm nay", "subtitle": "Đăng ký miễn phí tại flowa.vn", "caption": "Link in bio 👇" }
Body slide: { "headline": "Tối ưu chi phí", "subtitle": "Giảm 40% ngân sách quảng cáo nhờ AI targeting" }

QUAN TRỌNG: captionSuggestion và ctaSuggestion PHẢI tuân thủ công thức HOOK-BODY-CTA-HASHTAG và CTA đa tầng ở trên. Đây là yếu tố quyết định tương tác bài đăng.
${formData.includeLogo ? `\nLưu ý: Logo "${formData.brandName}" sẽ được thêm tự động, KHÔNG cần yêu cầu trong fullPrompt.` : ""}`;
};

Deno.serve(withPerf({ functionName: 'generate-carousel', slowThresholdMs: 45000 }, async (req) => {
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
      // Check if it's a service role call with userId in body (agent-creator-v2 pattern)
      if (formData.userId) {
        userId = formData.userId;
      } else {
        const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data, error: claimsError } = await supabaseAuth.auth.getClaims(token);
        if (!claimsError && data?.claims?.sub) {
          userId = data.claims.sub as string;
        }
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
    let brandCountryCode: string | null = null;
    let templatePrimaryColor: string | null = null;
    let templateSecondaryColors: string[] = [];
    
    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id, country_code, primary_color, secondary_colors")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        // Extract output language from brand's country_code
        outputLang = getOutputLanguage(template.country_code);
        brandCountryCode = template.country_code || null;
        templatePrimaryColor = (template as any).primary_color || null;
        templateSecondaryColors = (template as any).secondary_colors || [];
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
    const platformName: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn' };

    // Initialize PromptManager and fetch prompts from registry
    const brandColorsForPrompt = templatePrimaryColor ? { primary: templatePrimaryColor, secondary: templateSecondaryColors } : undefined;
    let systemPrompt = getSystemPrompt(formData, brandVoice, mergedRules, outputLang, brandCountryCode, brandColorsForPrompt); // Fallback to hardcoded
    let userPrompt = `Create ${formData.slideCount} carousel slides for the topic:
"${formData.topic}"

Platform: ${platformName[formData.platform] || formData.platform}
Carousel Style: ${formData.carouselStyle || 'educational'}
Brand: ${formData.brandName}
Output Language: ${langConfig.nativeName} (${langConfig.englishName})

Generate all ${formData.slideCount} slides in JSON format as defined by the tool.
Each slide must have compelling text content in ${langConfig.nativeName}.
Remember: fullPrompt is for BACKGROUND IMAGE only (no text rendering needed).
Follow the carousel style guidelines strictly.`;

    // Try to fetch prompts from registry — with safe fallback
    try {
      const pm = createPromptManager(supabase, 'generate-carousel', organizationId || undefined, formData.brandTemplateId);
      const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules, outputLang) : '';
      
      const registrySystem = await pm.get('system', {
        platform: platformName[formData.platform] || formData.platform,
        slideCount: String(formData.slideCount),
        brandName: formData.brandName,
        brandGuideline: formData.brandGuideline,
        includeLogo: formData.includeLogo ? 'true' : 'false',
        logoUrl: formData.logoUrl || '',
        brandVoiceSection,
      }).catch(() => null);
      
      const registryUser = await pm.get('generate', {
        topic: formData.topic,
        slideCount: String(formData.slideCount),
        platform: platformName[formData.platform] || formData.platform,
        brandName: formData.brandName,
      }).catch(() => null);
      
      // Only use registry prompts if they're valid (non-empty, sufficient length)
      const isValidPrompt = (p: string | null) => p && p.trim().length >= 50;
      
      if (isValidPrompt(registrySystem)) {
        systemPrompt = registrySystem!;
        console.log('[generate-carousel] System prompt: REGISTRY ✓');
      } else {
        console.warn('[generate-carousel] System prompt: FALLBACK (registry empty/missing/too short)');
      }
      
      if (isValidPrompt(registryUser)) {
        userPrompt = registryUser!;
        console.log('[generate-carousel] User prompt: REGISTRY ✓');
      } else {
        console.warn('[generate-carousel] User prompt: FALLBACK (registry empty/missing/too short)');
      }
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
                    textContent: {
                      type: "object",
                      description: "Nội dung chữ xuất hiện trên ảnh, có cấu trúc phân tầng",
                      properties: {
                        headline: { type: "string", description: "Dòng chính — ngắn gọn, đập vào mắt, 3-8 từ (BẮT BUỘC)" },
                        subtitle: { type: "string", description: "Dòng phụ — giải thích thêm, 1-2 câu ngắn (tùy chọn)" },
                        caption: { type: "string", description: "Dòng nhỏ — tagline hoặc CTA ngắn (tùy chọn)" },
                        dataValue: { type: "string", description: "Số liệu lớn nổi bật — ví dụ '150%', '2.5M' (chỉ dùng cho slide data)" },
                        dataLabel: { type: "string", description: "Nhãn cho số liệu — ví dụ 'Tăng trưởng doanh thu'" },
                      },
                      required: ["headline"],
                    },
                    designStyle: { type: "string", description: "Phong cách thiết kế" },
                    colorLayout: { type: "string", description: "Màu sắc (PHẢI bắt đầu bằng brand hex codes nếu có) và bố cục. KHÔNG tự chọn màu ngoài brand palette." },
                    aspectRatio: { type: "string", description: "Tỉ lệ khung hình" },
                    technicalRequirements: { type: "string", description: "Yêu cầu kỹ thuật" },
                    fullPrompt: { type: "string", description: "Prompt TIẾNG ANH chi tiết (tối thiểu 30 từ) mô tả CẢNH CỤ THỂ cho ảnh slide. PHẢI bao gồm: chủ thể liên quan đến nội dung slide + bối cảnh + ánh sáng + phong cách + bảng màu + để lại không gian cho text. KHÔNG viết nội dung text trong prompt. Kết thúc bằng 'consistent with previous slides: [style description]'." },
                  },
                  required: ["slideNumber", "objective", "textContent", "designStyle", "colorLayout", "aspectRatio", "technicalRequirements", "fullPrompt"],
                },
              },
              captionSuggestion: {
                type: "string",
                description: "Caption đăng bài theo công thức HOOK-BODY-CTA-HASHTAG. Dòng 1: Hook line gây tò mò (<125 ký tự, kỹ thuật: câu hỏi/số liệu sốc/statement ngược đời). Dòng 2-4: Body với emoji đầu dòng (✅📌💡🔥), mỗi dòng 1 ý, tóm tắt giá trị carousel. Dòng cuối: CTA line (💾 Save/↗️ Share/💬 Comment). Cuối cùng: hashtags phù hợp nền tảng (Facebook: 3-5, TikTok: 5-8). Dùng line breaks (\\n) giữa các phần.",
              },
              ctaSuggestion: {
                type: "string",
                description: "CTA đa tầng gồm 3 dòng có label: (1) 🎯 CTA chính — hành động trực tiếp (Save/Follow/Đăng ký), (2) 💬 Engagement — câu hỏi mở kéo comment, (3) 👥 Share — lý do tag bạn bè/chia sẻ. Mỗi dòng cách nhau bằng line break (\\n). Ngôn ngữ phù hợp nền tảng và tone thương hiệu.",
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

      // Robust JSON extraction helper
      const safeParseJson = (raw: string): any => {
        // Remove markdown fences
        let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        // Find JSON boundaries
        const jsonStart = cleaned.search(/[\{\[]/);
        if (jsonStart === -1) throw new Error('No JSON found in response');
        const openChar = cleaned[jsonStart];
        const closeChar = openChar === '{' ? '}' : ']';
        const jsonEnd = cleaned.lastIndexOf(closeChar);
        if (jsonEnd === -1 || jsonEnd <= jsonStart) throw new Error('Incomplete JSON boundaries');
        
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        
        // First attempt: direct parse
        try { return JSON.parse(cleaned); } catch (_e) { /* continue */ }
        
        // Second attempt: fix common issues (trailing commas, control chars)
        cleaned = cleaned
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, ' ');
        
        try { return JSON.parse(cleaned); } catch (_e) { /* continue */ }
        
        // Third attempt: character-level truncation repair
        // Walk backwards to find the last position where we can close all braces/brackets
        console.warn(`[generate-carousel] JSON truncated, attempting char-level repair. Length: ${cleaned.length}`);
        
        // Strategy: progressively chop from the end to find a parseable state
        // Find last complete property by scanning for safe cut points
        let repaired = cleaned;
        
        // Remove any trailing partial string (unmatched quote)
        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          // Odd quotes = we're inside a string. Find the last unmatched quote and cut there
          const lastQuote = repaired.lastIndexOf('"');
          if (lastQuote > 0) {
            repaired = repaired.substring(0, lastQuote);
            // Now remove the incomplete key or value before this quote
            // e.g. `, "someKey": "partial value` → remove from the comma
            repaired = repaired.replace(/,?\s*"[^"]*"?\s*:\s*$/, '');
            repaired = repaired.replace(/,?\s*"[^"]*$/, '');
            repaired = repaired.replace(/,?\s*$/, '');
          }
        }
        
        // Try parsing with progressive trimming (up to 20 attempts)
        for (let attempt = 0; attempt < 20; attempt++) {
          // Count braces/brackets
          let braces = 0, brackets = 0;
          for (const ch of repaired) {
            if (ch === '{') braces++;
            else if (ch === '}') braces--;
            else if (ch === '[') brackets++;
            else if (ch === ']') brackets--;
          }
          
          let candidate = repaired;
          // Close missing structures
          if (brackets > 0) candidate += ']'.repeat(brackets);
          if (braces > 0) candidate += '}'.repeat(braces);
          candidate = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          
          try {
            const parsed = JSON.parse(candidate);
            console.log(`[generate-carousel] JSON repair succeeded on attempt ${attempt + 1}, trimmed ${cleaned.length - repaired.length} chars`);
            return parsed;
          } catch (_e) {
            // Cut back further: remove last property/element
            const cutPoints = [
              repaired.lastIndexOf(','),
              repaired.lastIndexOf('},{'),
              repaired.lastIndexOf(',"'),
            ].filter(p => p > repaired.length * 0.3); // Don't cut more than 70%
            
            const cutAt = Math.max(...cutPoints);
            if (cutAt <= 0) break;
            repaired = repaired.substring(0, cutAt);
          }
        }
        
        // Final fallback: throw with details
        throw new Error(`JSON parse failed after repair. Length: ${cleaned.length}`);
      };

      // Try tool_calls first (preferred)
      const toolCall = result.data?.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        console.log('[generate-carousel] Parsed via tool_calls');
        return safeParseJson(toolCall.function.arguments);
      }

      // Fallback: extract JSON from content text
      const contentText = result.data?.choices?.[0]?.message?.content;
      if (contentText && typeof contentText === 'string') {
        console.log('[generate-carousel] No tool_calls, attempting content text fallback parse');
        try {
          const parsed = safeParseJson(contentText);
          if (parsed && (parsed.slides || Array.isArray(parsed))) {
            console.log('[generate-carousel] Successfully parsed from content text fallback');
            return parsed;
          }
        } catch (e) {
          console.warn('[generate-carousel] Content text fallback parse failed:', e.message);
        }
      }

      console.error('[generate-carousel] Invalid response structure:', JSON.stringify({
        hasChoices: !!result.data?.choices,
        hasMessage: !!result.data?.choices?.[0]?.message,
        hasToolCalls: !!result.data?.choices?.[0]?.message?.tool_calls,
        hasContent: !!contentText,
        contentPreview: contentText?.substring(0, 200),
      }));
      throw new Error("Invalid AI response format");
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
      carouselStyle: formData.carouselStyle || 'educational',
      visualPreset: formData.visualPreset || 'minimalist',
      outputLang,
      promptSchemaVersion: 'carousel_v5',
      brandVoice: brandVoice ? {
        positioning: brandVoice.brand_positioning,
        tone: brandVoice.tone_of_voice,
        formality: brandVoice.formality_level,
      } : null,
      brandGuidelineHash: formData.brandGuideline ? formData.brandGuideline.slice(0, 100) : null,
    };

    let generatedData: any;
    let fromCache = false;

    try {
      // Defense-in-depth: hash *actual* compliance rules so admin edits
      // (even without version bump) invalidate cache. Critical for
      // legal compliance in regulated verticals (aesthetic surgery, medical).
      const complianceHash = await hashComplianceRules(industryMemory);

      const cacheResult = await withCache({
        functionName,
        scope,
        organizationId: organizationId || undefined,
        brandTemplateId: formData.brandTemplateId,
        input: cacheInput,
        versions: {
          industryMemory: industryMemory?.version,
          brandVoice: brandVoice?.formality_level || undefined,
          complianceHash,
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
    // NORMALIZE SLIDES — ensure consistent textContent structure + validate fullPrompt
    // ============================================
    const carouselStyle = formData.carouselStyle || 'educational';
    if (generatedData.slides && Array.isArray(generatedData.slides)) {
      generatedData.slides = generatedData.slides.map((slide: CarouselSlide, idx: number) => {
        const slideNum = slide.slideNumber || (idx + 1);
        
        // Ensure textContent is structured object
        if (typeof slide.textContent === 'string') {
          const lines = slide.textContent.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
          slide.textContent = {
            headline: lines[0] || slide.objective || `Slide ${slideNum}`,
            subtitle: lines.slice(1).join(' ') || undefined,
          };
          console.log(`[normalize] Slide ${slideNum}: converted string textContent to structured`);
        }
        
        // Ensure headline is not empty
        const tc = slide.textContent as StructuredTextContent;
        if (!tc.headline || !tc.headline.trim()) {
          tc.headline = slide.objective || `Slide ${slideNum}`;
          console.warn(`[normalize] Slide ${slideNum}: empty headline, used objective as fallback`);
        }
        
        // Ensure objective is not empty
        if (!slide.objective || !slide.objective.trim()) {
          slide.objective = getSlideObjective(slideNum, formData.slideCount, outputLang, carouselStyle);
          console.warn(`[normalize] Slide ${slideNum}: empty objective, used default`);
        }
        
        // Validate fullPrompt: must be >= 30 words English, no text-rendering instructions
        if (slide.fullPrompt) {
          const wordCount = slide.fullPrompt.split(/\s+/).length;
          if (wordCount < 30) {
            console.warn(`[normalize] Slide ${slideNum}: fullPrompt too short (${wordCount} words)`);
          }
          // Strip text-rendering instructions that may have leaked
          slide.fullPrompt = slide.fullPrompt
            .replace(/\btext\s*[:：]\s*["'].*?["'].*?(?=\n|$)/gi, '')
            .replace(/\b(render|draw|write|display|show)\s+(text|words|letters|title|heading)\b.*?(?=\n|$)/gi, '')
            .trim();
        }
        
        return slide;
      });
      console.log(`[normalize] Processed ${generatedData.slides.length} slides`);
    }

    // ============================================
    // STRICT VALIDATION — guard against schema-valid but semantically empty slides
    // (JSON repair can produce slides with fullPrompt:"" or out-of-order numbering)
    // ============================================
    const validation = validateRepairedSlides(generatedData?.slides, formData.slideCount);
    if (!validation.valid) {
      console.error('[generate-carousel] Slide validation FAILED:', validation.errors);
      // Throw before any DB write or response — caller will see error and can retry.
      // Important: this is reached only when not fromCache OR cached payload is corrupt;
      // in either case we refuse to serve garbage.
      throw new Error(
        `Carousel validation failed: ${validation.errors.slice(0, 3).join('; ')}` +
        (validation.errors.length > 3 ? ` (+${validation.errors.length - 3} more)` : '')
      );
    }
    console.log(`[validate] All ${generatedData.slides.length} slides passed strict validation`);

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

    // Dedup check: prevent duplicate carousel within 2 minutes (match style+preset too)
    const { data: existingCarousel } = await supabase
      .from("carousels")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", formData.topic)
      .eq("organization_id", organizationId)
      .eq("carousel_style", formData.carouselStyle || 'educational')
      .eq("visual_preset", formData.visualPreset || 'minimalist')
      .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCarousel) {
      console.log(`Dedup: returning existing carousel ${existingCarousel.id}`);
      return new Response(JSON.stringify({ ...existingCarousel, fromCache: true, dedup: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Embed brand colors into brand_guideline for downstream use
    let brandGuidelineToSave = formData.brandGuideline || '';
    {
      const primaryColor = (formData as any).brandPrimaryColor || templatePrimaryColor || null;
      const secColors = (formData as any).brandSecondaryColors || (templateSecondaryColors.length > 0 ? templateSecondaryColors : []);
      if (primaryColor) {
        try {
          const existing = brandGuidelineToSave ? JSON.parse(brandGuidelineToSave) : {};
          existing.primaryColor = primaryColor;
          if (secColors.length > 0) existing.secondaryColors = secColors;
          brandGuidelineToSave = JSON.stringify(existing);
        } catch {
          brandGuidelineToSave = JSON.stringify({
            text: brandGuidelineToSave,
            primaryColor,
            ...(secColors.length > 0 ? { secondaryColors: secColors } : {}),
          });
        }
        console.log('[generate-carousel] Brand colors embedded:', primaryColor, secColors);
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
        brand_guideline: brandGuidelineToSave,
        include_logo: formData.includeLogo,
        slides_content: generatedData.slides,
        caption_suggestion: generatedData.captionSuggestion,
        cta_suggestion: generatedData.ctaSuggestion,
        status: initialStatus,
        brand_template_id: formData.brandTemplateId || null,
        industry_template_id: industryMemory?.id || null,
        industry_template_version: industryMemory?.version || null,
        campaign_id: formData.campaignId || null,
        carousel_style: formData.carouselStyle || 'educational',
        visual_preset: formData.visualPreset || 'minimalist',
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
}));
