import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  expert_share: "Chuyên gia chia sẻ kiến thức",
  analyze_explain: "Phân tích – giải thích",
  warning_mistake: "Cảnh báo – bóc tách sai lầm",
  quick_qa: "Hỏi – đáp nhanh",
};

const CHARACTER_TYPE_LABELS: Record<string, string> = {
  male_expert: "Chuyên gia nam",
  female_expert: "Chuyên gia nữ",
  consultant: "Nhân vật tư vấn",
  instructor: "Nhân vật hướng dẫn",
  ai_presenter: "Nhân vật trung tính (AI presenter)",
};

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
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi lời thoại trong kịch bản PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  const tones = mergedRules?.tone_of_voice || voice.tone_of_voice || [];
  if (tones.length > 0) {
    const toneLabels = tones.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice cho lời thoại: ${toneLabels}`);
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
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE CHO SCRIPT`);
  parts.push(`1. Lời thoại trong mỗi prompt PHẢI đúng Tone of Voice`);
  parts.push(`2. Giữ nhất quán xuyên suốt kịch bản - KHÔNG thay đổi giọng giữa các prompt`);
  parts.push(`3. Ngữ điệu phải phù hợp với định vị thương hiệu`);
  
  const preferredWords = mergedRules?.preferred_words || voice.preferred_words || [];
  if (preferredWords.length > 0) {
    parts.push(`\n### TỪ NÊN DÙNG trong lời thoại`);
    parts.push(preferredWords.join(", "));
  }
  
  const forbiddenWords = mergedRules?.forbidden_words || voice.forbidden_words || [];
  if (forbiddenWords.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG trong lời thoại)`);
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

function getPromptCount(duration: number): string {
  switch (duration) {
    case 60:
      return "7-8";
    case 90:
      return "10-11";
    case 120:
      return "14-15";
    case 180:
      return "21-23";
    default:
      return "7-8";
  }
}

function buildSystemPrompt(
  topic: string,
  duration: number,
  videoType: string,
  characterType: string,
  brandVoice?: BrandVoice,
  mergedRules?: MergedRules
): string {
  const promptCount = getPromptCount(duration);
  const videoTypeName = VIDEO_TYPE_LABELS[videoType] || "Chuyên gia chia sẻ kiến thức";
  const characterTypeName = CHARACTER_TYPE_LABELS[characterType] || "Chuyên gia";

  // Build Brand Voice section if available
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice, mergedRules) : "";

  return `Bạn là một hệ thống AI chuyên tạo KỊCH BẢN & PROMPT VIDEO cho video ngắn TikTok (1–3 phút), phục vụ quy trình sản xuất: VEO 3 (HÌNH ẢNH) → Minimax (GIỌNG NÓI) → CapCut (DỰNG).

${brandVoiceSection}

THÔNG TIN ĐẦU VÀO:
- Chủ đề: ${topic}
- Thời lượng: ${duration} giây
- Thể loại: ${videoTypeName}
- Nhân vật: ${characterTypeName}
- Số lượng prompt cần tạo: ${promptCount} prompt

NGUYÊN TẮC VAI TRÒ NHÂN VẬT:
- Nhân vật được chọn chỉ ảnh hưởng đến cách xưng hô, cách diễn đạt, sắc thái giọng điệu
- TUYỆT ĐỐI KHÔNG mô tả ngoại hình, trang phục, bối cảnh
- TUYỆT ĐỐI KHÔNG thay đổi tư thế lớn giữa các prompt

CẤU TRÚC VIDEO:
- Tổng thời lượng: ${duration} giây
- Mỗi PROMPT ≈ 8 giây
- Mỗi prompt chỉ chứa 01 ý hoàn chỉnh
- Tất cả prompt khi ghép lại phải tạo thành MỘT NHÂN VẬT NÓI LIÊN TỤC – KHÔNG RỜI RẠC

QUY ƯỚC GIỌNG NÓI (CỐ ĐỊNH):
- Giọng: miền Bắc
- Phong cách: Chuyên nghiệp, điềm tĩnh, tự tin, không quảng cáo
- Ngữ điệu: Nhấn mạnh từ khóa chuyên môn, có nhịp nghỉ tự nhiên, không nói quá nhanh

QUY ƯỚC CHUYỂN ĐỘNG NHÂN VẬT (VEO 3):
- Tư thế: Đứng hoặc ngồi ổn định, nhìn thẳng camera
- Chuyển động: Nhẹ, chậm, có kiểm soát, gật đầu nhẹ khi nhấn ý, đưa tay nhấn từ khóa
- TUYỆT ĐỐI KHÔNG: Quay đầu đột ngột, thay đổi tư thế lớn, cử chỉ mạnh hoặc liên tục

ĐỊNH DẠNG CHUẨN CỦA MỖI PROMPT:

PROMPT X:

[1] Chuyển động nhân vật:
(Mô tả ngắn, liên tục, kế thừa chuyển động prompt trước)

[2] Lời thoại (đọc nguyên văn):
"…"

[3] Giọng điệu:
Giọng miền Bắc, phù hợp với vai trò nhân vật đã chọn, điềm tĩnh, rõ ràng, nhấn mạnh từ khóa chính

NGUYÊN TẮC NỐI MẠCH:
- Prompt sau kế thừa tư thế, trạng thái, nhịp nói của prompt trước
- Lời thoại: Không chào hỏi lại, không reset nội dung, không gộp nhiều ý
- Nghe như: MỘT NGƯỜI ĐANG NÓI LIÊN TỤC

LOGIC KỊCH BẢN:
1. Hook (1–2 prompt) - Thu hút người xem
2. Vấn đề / hiểu lầm - Nêu vấn đề
3. Phân tích theo vai trò nhân vật - Giải thích chi tiết
4. Kết luận / lời khuyên - Tổng kết
5. CTA nhẹ (nếu có, không bán hàng)

YÊU CẦU ĐẦU RA:
– Chỉ xuất danh sách PROMPT
– Đúng định dạng
– Không giải thích
– Không bình luận
– Không thêm nội dung ngoài prompt`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, video_type, character_type, brandTemplateId, organization_id: requestOrgId } = await req.json();

    if (!topic || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: "Vui lòng nhập chủ đề video" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key chưa được cấu hình" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating script for topic:", topic);
    console.log("Duration:", duration, "Video type:", video_type, "Character:", character_type);

    // Load Brand Voice and Industry Memory from template if provided
    let brandVoice: BrandVoice | undefined;
    let industryMemory: IndustryMemory | null = null;
    let mergedRules: MergedRules | undefined;
    
    if (brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules, industry_template_id")
        .eq("id", brandTemplateId)
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
        console.log("Brand Voice loaded for script:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
        
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

    const systemPrompt = buildSystemPrompt(topic, duration, video_type, character_type, brandVoice, mergedRules);

    // Define AI generation function
    const generateAIContent = async (): Promise<string> => {
      console.log("Calling Lovable AI for script (no cache hit)...");
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
            { role: "user", content: `Hãy tạo kịch bản video TikTok về chủ đề: "${topic}"` },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);

        if (response.status === 429) {
          throw { status: 429, message: "Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau." };
        }
        if (response.status === 402) {
          throw { status: 402, message: "Cần nạp thêm credits để tiếp tục sử dụng." };
        }

        throw new Error("Không thể tạo kịch bản. Vui lòng thử lại.");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("No content in AI response:", data);
        throw new Error("AI không trả về nội dung");
      }

      return content;
    };

    // Use cache wrapper
    const functionName = 'generate-script';
    const scope = CACHE_SCOPE[functionName] || 'org';
    const ttlDays = CACHE_TTL[functionName] || 7;

    // Build cache input
    const cacheInput = {
      topic,
      duration,
      video_type,
      character_type,
      brandVoice: brandVoice ? {
        positioning: brandVoice.brand_positioning,
        tone: brandVoice.tone_of_voice,
        formality: brandVoice.formality_level,
      } : null,
    };

    let content: string;
    let fromCache = false;

    try {
      const cacheResult = await withCache({
        functionName,
        scope,
        organizationId: requestOrgId || undefined,
        brandTemplateId,
        input: cacheInput,
        versions: {
          industryMemory: industryMemory?.version,
          brandVoice: brandVoice?.formality_level || undefined,
        },
        ttlDays,
        generateFn: generateAIContent,
      });

      content = cacheResult.data;
      fromCache = cacheResult.fromCache;
      console.log(`Script generation: ${fromCache ? 'CACHE HIT' : 'AI GENERATED'}`);
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

    console.log("Script generated successfully, saving to database...");

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    let organizationId: string | null = requestOrgId || null;
    
    if (authHeader) {
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id || null;
      
      if (userId && !organizationId) {
        // Fallback: get first org where user is a member
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        
        organizationId = orgMember?.organization_id || null;
      }
      console.log("Using organization_id:", organizationId, "(from request:", !!requestOrgId, ")");
    }

    // Generate title from topic
    const title = topic.length > 50 ? topic.substring(0, 50) + "..." : topic;

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

    const { data: savedScript, error: dbError } = await supabase
      .from("scripts")
      .insert({
        title,
        topic,
        duration,
        video_type,
        character_type,
        content,
        user_id: userId,
        organization_id: organizationId,
        status: initialStatus,
        industry_template_id: industryMemory?.id || null,
        industry_template_version: industryMemory?.version || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Không thể lưu kịch bản vào database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Script saved with ID:", savedScript.id, "fromCache:", fromCache);

    return new Response(JSON.stringify({ ...savedScript, fromCache }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});