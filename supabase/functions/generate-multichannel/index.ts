import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormData {
  topic: string;
  industry?: string;
  contentGoal: string;
  channels: string[];
  brandTemplateId?: string;
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
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi nội dung PHẢI tuân theo Brand Voice.`);
  
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
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE BẮT BUỘC`);
  parts.push(`1. Brand Voice OVERRIDE mọi style khác`);
  parts.push(`2. Không được "sáng tạo giọng mới"`);
  parts.push(`3. Không thay đổi giọng giữa các kênh`);
  parts.push(`4. Nếu yêu cầu MÂU THUẪN với Brand Voice → ƯU TIÊN Brand Voice`);
  parts.push(`5. KHÔNG thông báo hay giải thích về Brand Voice trong output`);
  
  if (voice.preferred_words && voice.preferred_words.length > 0) {
    parts.push(`\n### TỪ PHẢI DÙNG (ưu tiên sử dụng)`);
    parts.push(voice.preferred_words.join(", "));
  }
  
  if (voice.forbidden_words && voice.forbidden_words.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG)`);
    parts.push(voice.forbidden_words.join(", "));
  }
  
  parts.push(`\n### EMOJI`);
  if (voice.allow_emoji) {
    parts.push(`Có thể dùng emoji TIẾT CHẾ theo từng kênh (Website/Google Maps/Zalo OA/Telegram: KHÔNG emoji)`);
  } else {
    parts.push(`TUYỆT ĐỐI KHÔNG dùng emoji trong bất kỳ kênh nào`);
  }
  
  if (voice.compliance_rules && voice.compliance_rules.length > 0) {
    parts.push(`\n### QUY TẮC TUÂN THỦ`);
    voice.compliance_rules.forEach(rule => {
      parts.push(`- ${rule}`);
    });
  }
  
  return parts.join("\n");
};

// ============================================
// CHANNEL SETTINGS ENGINE - Chi tiết rules cho từng kênh
// Brand Voice là LUẬT NỀN, Channel Settings là LUẬT TRIỂN KHAI
// ============================================

interface ChannelSettings {
  min_length?: number;
  max_length: number;
  length_unit: 'words' | 'chars';
  hook_required: boolean;
  hook_style?: string;
  bullet_allowed: boolean;
  cta_policy: 'required' | 'optional' | 'soft' | 'none';
  has_subject_line?: boolean;
  emoji_allowed: boolean;
  emoji_limit?: number;
  hashtag_limit: number;
  hashtag_position?: 'none' | 'end' | 'inline';
  line_break_style: 'many' | 'short' | 'normal' | 'minimal';
  link_position: 'body' | 'end' | 'allowed' | 'none';
  format_description?: string;
}

// Partial override type
type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position'
>>;

type ChannelOverrides = Record<string, ChannelOverride> | null;

const DEFAULT_CHANNEL_SETTINGS: Record<string, ChannelSettings> = {
  website: {
    min_length: 800,
    max_length: 1500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật tít',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  facebook: {
    min_length: 120,
    max_length: 300,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'BẮT BUỘC 2 dòng đầu là hook mạnh (câu sốc, số liệu, câu hỏi)',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'short',
    link_position: 'body',
    format_description: 'Xuống dòng ngắn, chia đoạn 2-3 dòng',
  },
  instagram: {
    min_length: 50,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook ngắn gọn, hấp dẫn',
    bullet_allowed: false,
    cta_policy: 'optional',
    emoji_allowed: true,
    emoji_limit: 5,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'many',
    link_position: 'none',
    format_description: 'Nhiều xuống dòng, KHÔNG chèn hashtag trong body, hashtag cuối bài',
  },
  twitter: {
    min_length: 0,
    max_length: 280,
    length_unit: 'chars',
    hook_required: true,
    hook_style: 'quan điểm rõ ràng ngay câu đầu',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 1,
    hashtag_position: 'end',
    line_break_style: 'minimal',
    link_position: 'allowed',
    format_description: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số 1/, 2/..., câu ngắn sắc nét',
  },
  google_maps: {
    min_length: 80,
    max_length: 150,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không',
    bullet_allowed: false,
    cta_policy: 'none',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'none',
    format_description: 'Thực tế, xác thực, khách quan, như đánh giá chuyên nghiệp',
  },
  linkedin: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'nhẹ, không giật tít, insight hoặc số liệu',
    bullet_allowed: true,
    cta_policy: 'soft',
    emoji_allowed: true,
    emoji_limit: 2,
    hashtag_limit: 3,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: 'Chuyên nghiệp, rõ đoạn, B2B authority, perspective cá nhân',
  },
  email: {
    min_length: 150,
    max_length: 400,
    length_unit: 'words',
    hook_required: false,
    bullet_allowed: true,
    cta_policy: 'required',
    has_subject_line: true,
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: 'Có Subject line hấp dẫn (không spam trigger), đoạn ngắn, dễ đọc, CTA rõ',
  },
  youtube: {
    min_length: 500,
    max_length: 800,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'hook 5 giây đầu gây tò mò',
    bullet_allowed: true,
    cta_policy: 'required',
    emoji_allowed: true,
    emoji_limit: 3,
    hashtag_limit: 5,
    hashtag_position: 'end',
    line_break_style: 'normal',
    link_position: 'body',
    format_description: 'Script 3-5 phút với Hook + Intro + Content (chia segments) + CTA subscribe + Outro',
  },
  zalo_oa: {
    min_length: 60,
    max_length: 150,
    length_unit: 'words',
    hook_required: true,
    hook_style: 'trực diện, không giật tít',
    bullet_allowed: false,
    cta_policy: 'required',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'short',
    link_position: 'allowed',
    format_description: 'Thông báo rõ việc, thân thiện local, format phù hợp mobile',
  },
  telegram: {
    min_length: 100,
    max_length: 500,
    length_unit: 'words',
    hook_required: false,
    hook_style: 'không cần giật',
    bullet_allowed: true,
    cta_policy: 'optional',
    emoji_allowed: false,
    emoji_limit: 0,
    hashtag_limit: 0,
    hashtag_position: 'none',
    line_break_style: 'normal',
    link_position: 'allowed',
    format_description: 'Bullet points, dễ đọc, linh hoạt',
  },
};

// Build chi tiết rules prompt cho AI từ settings
function buildChannelRulesPrompt(
  channel: string,
  settings: ChannelSettings,
  brandAllowEmoji: boolean
): string {
  const parts: string[] = [];
  
  // Channel name
  parts.push(`### ${channel.toUpperCase()}`);
  
  // Length
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  if (settings.min_length) {
    parts.push(`- Độ dài: ${settings.min_length}–${settings.max_length} ${lengthLabel}`);
  } else {
    parts.push(`- Độ dài: Tối đa ${settings.max_length} ${lengthLabel}`);
  }
  
  // Hook
  if (settings.hook_required) {
    parts.push(`- Hook: ${settings.hook_style || 'BẮT BUỘC'}`);
  } else {
    parts.push(`- Hook: ${settings.hook_style || 'Không bắt buộc'}`);
  }
  
  // CTA
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc, rõ ràng',
    soft: 'Có nhưng mềm, không bán',
    optional: 'Tuỳ chọn',
    none: 'Không có CTA bán hàng',
  };
  parts.push(`- CTA: ${ctaLabels[settings.cta_policy] || settings.cta_policy}`);
  
  // Emoji - Brand Voice overrides
  if (!brandAllowEmoji) {
    parts.push(`- Emoji: KHÔNG (Brand Voice yêu cầu)`);
  } else if (settings.emoji_allowed) {
    parts.push(`- Emoji: Cho phép, tối đa ${settings.emoji_limit || 3}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
  }
  
  // Hashtag
  if (settings.hashtag_limit > 0) {
    const posLabel = settings.hashtag_position === 'end' ? 'cuối bài' : 'trong bài';
    parts.push(`- Hashtag: Tối đa ${settings.hashtag_limit}, đặt ${posLabel}`);
  } else {
    parts.push(`- Hashtag: KHÔNG`);
  }
  
  // Link
  const linkLabels: Record<string, string> = {
    body: 'Cho phép trong bài',
    end: 'Cuối bài',
    allowed: 'Có thể',
    none: 'KHÔNG link',
  };
  parts.push(`- Link: ${linkLabels[settings.link_position] || settings.link_position}`);
  
  // Format description
  if (settings.format_description) {
    parts.push(`- Format: ${settings.format_description}`);
  }
  
  // Subject line for email
  if (settings.has_subject_line) {
    parts.push(`- Bao gồm Subject line hấp dẫn (không spam trigger)`);
  }
  
  return parts.join('\n');
}

// Helper: Merge default settings with brand overrides
function mergeChannelSettings(channel: string, overrides: ChannelOverrides): ChannelSettings {
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  if (!defaults) return DEFAULT_CHANNEL_SETTINGS.facebook; // Fallback
  if (!overrides || !overrides[channel]) return defaults;
  
  const override = overrides[channel];
  return {
    ...defaults,
    max_length: override.max_length ?? defaults.max_length,
    min_length: override.min_length ?? defaults.min_length,
    hook_required: override.hook_required ?? defaults.hook_required,
    cta_policy: override.cta_policy ?? defaults.cta_policy,
    emoji_allowed: override.emoji_allowed ?? defaults.emoji_allowed,
    emoji_limit: override.emoji_limit ?? defaults.emoji_limit,
    hashtag_limit: override.hashtag_limit ?? defaults.hashtag_limit,
    link_position: override.link_position ?? defaults.link_position,
  };
}

const getSystemPrompt = (
  brandName: string, 
  brandGuideline: string | null,
  primaryColor: string | null,
  contentGoal: string,
  channels: string[],
  brandVoice?: BrandVoice,
  channelOverrides?: ChannelOverrides
): string => {
  const goalDescriptions: Record<string, string> = {
    education: "Giáo dục - Chia sẻ kiến thức chuyên sâu, hướng dẫn thực hành. Tone: Chuyên gia, rõ ràng, có giá trị.",
    awareness: "Nhận diện - Tăng nhận biết thương hiệu. Tone: Ấn tượng, đáng nhớ, consistent brand voice.",
    engagement: "Tương tác - Khuyến khích bình luận, chia sẻ. Tone: Gần gũi, đặt câu hỏi, tạo tranh luận.",
    expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu. Tone: Chuyên nghiệp, có insight, data-driven.",
    conversion: "Chuyển đổi - Thúc đẩy hành động. Tone: Thuyết phục, urgency nhẹ, clear CTA.",
  };

  const brandAllowEmoji = brandVoice?.allow_emoji ?? true;
  
  // Build channel rules using the new settings engine with overrides
  const selectedChannelRules = channels
    .map(ch => {
      const settings = mergeChannelSettings(ch, channelOverrides || null);
      return buildChannelRulesPrompt(ch, settings, brandAllowEmoji);
    })
    .filter(Boolean)
    .join("\n\n");

  // Build Brand Voice section if available
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice) : "";

  return `Bạn là SOCIAL CHANNEL SETTINGS ENGINE - hệ thống AI tạo NỘI DUNG ĐA KÊNH cho doanh nghiệp (B2B).

${brandVoiceSection}

## NGUYÊN TẮC LÕI
ONE TOPIC → ONE CORE MESSAGE → MULTI-CHANNEL CONTENT
- Từ MỘT chủ đề, tạo nội dung PHÙ HỢP RIÊNG cho từng kênh
- Nội dung dùng được NGAY để đăng thật
- KHÔNG sao chép máy móc giữa các kênh
- Giữ thông điệp lõi NHẤT QUÁN

## BRAND CONTEXT
Brand name: ${brandName}
${brandGuideline ? `Brand guideline: ${brandGuideline}` : ""}
${primaryColor ? `Màu chủ đạo: ${primaryColor}` : ""}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[contentGoal] || contentGoal}

## QUY ƯỚC THEO TỪNG KÊNH (SOCIAL CHANNEL SETTINGS)
Brand Voice là LUẬT NỀN. Channel Settings là LUẬT TRIỂN KHAI.
Không được để Channel Settings phá Brand Voice.

${selectedChannelRules}

## KIỂM TRA CUỐI (BẮT BUỘC)
Trước khi xuất nội dung, tự kiểm tra:
- Có vượt max length không? → TỰ RÚT GỌN, giữ ý chính
- Có vi phạm emoji / hashtag không? → TỰ ĐIỀU CHỈNH
- Có CTA sai quy định không? → TỰ SỬA
- Có format sai nền tảng không? → TỰ ĐIỀU CHỈNH

## NGUYÊN TẮC BẮT BUỘC
1. KHÔNG dùng chung một bài cho mọi kênh
2. KHÔNG copy nguyên văn giữa các kênh
3. Mỗi kênh phải đúng hành vi người đọc, đúng giới hạn kỹ thuật
4. Giữ thông điệp lõi NHẤT QUÁN xuyên suốt
5. Giọng văn: Chuyên nghiệp, rõ ràng, không quảng cáo lộ liễu, phù hợp B2B

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung
- Không thêm kênh không được yêu cầu
- Không dùng emoji cho Website, Google Maps, Zalo OA, Email, Telegram${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji ở BẤT KỲ kênh nào (Brand Voice yêu cầu)" : ""}
- Không lặp lại câu chữ giữa các kênh
- Không hiển thị cài đặt
- Không giải thích logic xử lý`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: FormData = await req.json();
    console.log("Generating multi-channel content for:", formData.topic);

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

    // Get user's organization_id
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    
    const organizationId = orgMember?.organization_id || null;
    console.log("User organization_id:", organizationId);

    // Load brand template if provided
    let brandName = "Thương hiệu";
    let brandGuideline: string | null = null;
    let primaryColor: string | null = null;
    let industry: string | null = formData.industry || null;
    let brandVoice: BrandVoice | undefined;
    let channelOverrides: ChannelOverrides = null;

    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        brandName = template.brand_name;
        brandGuideline = template.brand_guideline;
        primaryColor = template.primary_color;
        // Use industry from template if not provided in form
        if (!industry && template.industry && Array.isArray(template.industry) && template.industry.length > 0) {
          industry = template.industry.join(', ');
        }
        // Extract Brand Voice
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
        // Extract Channel Overrides
        channelOverrides = template.channel_overrides || null;
        console.log("Brand Voice loaded:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
        if (channelOverrides) {
          console.log("Channel overrides loaded:", Object.keys(channelOverrides));
        }
      }
    }

    const systemPrompt = getSystemPrompt(
      brandName,
      brandGuideline,
      primaryColor,
      formData.contentGoal,
      formData.channels,
      brandVoice,
      channelOverrides
    );

    const userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.
Đảm bảo thông điệp lõi nhất quán nhưng format và tone khác nhau theo từng nền tảng.
Nội dung sẵn sàng đăng ngay.`;

    // Build tool parameters based on selected channels
    const channelProperties: Record<string, object> = {};
    const channelDescriptions: Record<string, string> = {
      website: "Nội dung cho Website/Blog (800-1500 chữ, markdown format, không emoji)",
      facebook: "Nội dung cho Facebook (120-300 chữ, hook mạnh, chia đoạn ngắn)",
      instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag cuối)",
      twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
      google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
      linkedin: "Nội dung cho LinkedIn (150-400 chữ, B2B authority, insight)",
      email: "Nội dung Email (150-400 chữ, subject line + body + CTA)",
      youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
      zalo_oa: "Nội dung Zalo OA (60-150 chữ, thân thiện, local)",
      telegram: "Nội dung Telegram (100-500 chữ, bullet, dễ đọc)",
    };

    formData.channels.forEach(channel => {
      if (channelDescriptions[channel]) {
        channelProperties[`${channel}_content`] = {
          type: "string",
          description: channelDescriptions[channel],
        };
      }
    });

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_multichannel_content",
          description: "Generate content for multiple marketing channels",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Tiêu đề ngắn gọn cho bộ nội dung (dựa trên chủ đề)",
              },
              ...channelProperties,
            },
            required: ["title", ...Object.keys(channelProperties)],
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
        tool_choice: { type: "function", function: { name: "generate_multichannel_content" } },
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

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_multichannel_content") {
      throw new Error("Invalid AI response format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    console.log("Generated content:", generatedData.title);

    // Save to database
    const { data: content, error: dbError } = await supabase
      .from("multi_channel_contents")
      .insert({
        user_id: userId,
        organization_id: organizationId,
        title: generatedData.title,
        topic: formData.topic,
        industry: industry,
        content_goal: formData.contentGoal,
        selected_channels: formData.channels,
        brand_template_id: formData.brandTemplateId || null,
        brand_name: brandName,
        brand_guideline: brandGuideline,
        primary_color: primaryColor,
        website_content: generatedData.website_content || null,
        facebook_content: generatedData.facebook_content || null,
        instagram_content: generatedData.instagram_content || null,
        twitter_content: generatedData.twitter_content || null,
        google_maps_content: generatedData.google_maps_content || null,
        linkedin_content: generatedData.linkedin_content || null,
        email_content: generatedData.email_content || null,
        youtube_content: generatedData.youtube_content || null,
        zalo_oa_content: generatedData.zalo_oa_content || null,
        telegram_content: generatedData.telegram_content || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save content");
    }

    console.log("Content saved with ID:", content.id);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-multichannel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
