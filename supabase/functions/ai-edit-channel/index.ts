import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { generateTraceId, saveMetrics, estimateTokens } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIEditRequest {
  contentId: string;
  channel: string;
  instruction: string;
  currentContent: string;
}

// ============================================
// CHANNEL SETTINGS ENGINE
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

const DEFAULT_CHANNEL_SETTINGS: Record<string, ChannelSettings> = {
  website: {
    min_length: 800, max_length: 2000, length_unit: 'words',
    hook_required: false, hook_style: 'không cần giật tít',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  facebook: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: true, hook_style: 'BẮT BUỘC hook mạnh 2 dòng đầu',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 3,
    hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'short', link_position: 'body',
    format_description: 'Xuống dòng ngắn, chia đoạn 2-3 dòng',
  },
  instagram: {
    min_length: 50, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'hook ngắn gọn',
    bullet_allowed: false, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 5,
    hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'many', link_position: 'none',
    format_description: 'Nhiều xuống dòng, hashtag cuối bài',
  },
  twitter: {
    min_length: 0, max_length: 280, length_unit: 'chars',
    hook_required: true, hook_style: 'quan điểm ngay câu đầu',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 1, hashtag_position: 'end',
    line_break_style: 'minimal', link_position: 'allowed',
    format_description: 'Thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số 1/, 2/...',
  },
  google_maps: {
    min_length: 80, max_length: 150, length_unit: 'words',
    hook_required: false, hook_style: 'không',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'none',
    format_description: 'Thực tế, xác thực, khách quan',
  },
  linkedin: {
    min_length: 300, max_length: 600, length_unit: 'words',
    hook_required: true, hook_style: 'nhẹ, không giật tít',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: true, emoji_limit: 2,
    hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'allowed',
    format_description: 'Chuyên nghiệp, B2B authority',
  },
  email: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: false, bullet_allowed: true, cta_policy: 'required',
    has_subject_line: true, emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'Có Subject line, đoạn ngắn, CTA rõ',
  },
  youtube: {
    min_length: 500, max_length: 800, length_unit: 'words',
    hook_required: true, hook_style: 'hook 5 giây đầu',
    bullet_allowed: true, cta_policy: 'required',
    emoji_allowed: true, emoji_limit: 3,
    hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'body',
    format_description: 'Script Hook + Intro + Content + CTA + Outro',
  },
  zalo_oa: {
    min_length: 60, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'trực diện',
    bullet_allowed: false, cta_policy: 'required',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'short', link_position: 'allowed',
    format_description: 'Thông báo rõ việc, thân thiện local',
  },
  telegram: {
    min_length: 200, max_length: 500, length_unit: 'words',
    hook_required: false, hook_style: 'không cần giật',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'allowed',
    format_description: 'Bullet, dễ đọc, linh hoạt',
  },
};

// Partial override type
type ChannelOverride = Partial<Pick<ChannelSettings, 
  'max_length' | 'min_length' | 'hook_required' | 'cta_policy' | 
  'emoji_allowed' | 'emoji_limit' | 'hashtag_limit' | 'link_position'
>>;

type ChannelOverrides = Record<string, ChannelOverride> | null;

function mergeChannelSettings(channel: string, overrides: ChannelOverrides): ChannelSettings {
  const defaults = DEFAULT_CHANNEL_SETTINGS[channel];
  if (!defaults) return DEFAULT_CHANNEL_SETTINGS.facebook;
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

function buildChannelRulesPrompt(channel: string, settings: ChannelSettings): string {
  const parts: string[] = [];
  parts.push(`### QUY ƯỚC KÊNH ${channel.toUpperCase()}`);
  
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  parts.push(`- Độ dài: ${settings.min_length || 0}–${settings.max_length} ${lengthLabel}`);
  parts.push(`- Hook: ${settings.hook_required ? settings.hook_style || 'BẮT BUỘC' : 'Không bắt buộc'}`);
  
  const ctaLabels: Record<string, string> = { required: 'Bắt buộc', soft: 'Mềm', optional: 'Tuỳ chọn', none: 'Không' };
  parts.push(`- CTA: ${ctaLabels[settings.cta_policy]}`);
  
  if (settings.emoji_allowed) {
    parts.push(`- Emoji: Tối đa ${settings.emoji_limit}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
  }
  
  parts.push(`- Hashtag: ${settings.hashtag_limit > 0 ? `Tối đa ${settings.hashtag_limit}` : 'KHÔNG'}`);
  if (settings.format_description) parts.push(`- Format: ${settings.format_description}`);
  if (settings.has_subject_line) parts.push(`- Bao gồm Subject line`);
  
  return parts.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, channel, instruction, currentContent }: AIEditRequest = await req.json();
    console.log(`AI editing ${channel} for content ${contentId} with instruction: ${instruction}`);

    if (!contentId || !channel || !instruction || !currentContent) {
      throw new Error("contentId, channel, instruction và currentContent là bắt buộc");
    }

    if (!DEFAULT_CHANNEL_SETTINGS[channel]) {
      throw new Error(`Kênh không hợp lệ: ${channel}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load content metadata for brand context
    const { data: content, error: fetchError } = await supabase
      .from("multi_channel_contents")
      .select("brand_name, brand_guideline, content_goal, topic, industry, brand_template_id")
      .eq("id", contentId)
      .single();

    if (fetchError || !content) {
      console.error("Fetch error:", fetchError);
      throw new Error("Không tìm thấy nội dung");
    }

    // Load FULL brand voice profile from brand template
    interface BrandVoiceProfile {
      allow_emoji: boolean;
      tone_of_voice: string[] | null;
      language_style: string[] | null;
      formality_level: string | null;
      preferred_words: string[] | null;
      forbidden_words: string[] | null;
      compliance_rules: string[] | null;
      brand_positioning: string | null;
      channel_overrides: ChannelOverrides;
    }

    let brandVoice: BrandVoiceProfile = {
      allow_emoji: true,
      tone_of_voice: null,
      language_style: null,
      formality_level: null,
      preferred_words: null,
      forbidden_words: null,
      compliance_rules: null,
      brand_positioning: null,
      channel_overrides: null,
    };

    if (content.brand_template_id) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select(`
          allow_emoji, 
          channel_overrides,
          tone_of_voice,
          language_style,
          formality_level,
          preferred_words,
          forbidden_words,
          compliance_rules,
          brand_positioning
        `)
        .eq("id", content.brand_template_id)
        .single();
      
      if (template) {
        brandVoice = {
          allow_emoji: template.allow_emoji ?? true,
          tone_of_voice: template.tone_of_voice,
          language_style: template.language_style,
          formality_level: template.formality_level,
          preferred_words: template.preferred_words,
          forbidden_words: template.forbidden_words,
          compliance_rules: template.compliance_rules,
          brand_positioning: template.brand_positioning,
          channel_overrides: template.channel_overrides || null,
        };
      }
    }

    const channelSettings = mergeChannelSettings(channel, brandVoice.channel_overrides);
    const channelRulesPrompt = buildChannelRulesPrompt(channel, channelSettings);

    // Build Brand Voice section
    const buildBrandVoicePrompt = (): string => {
      const parts: string[] = [];
      
      if (brandVoice.tone_of_voice?.length) {
        parts.push(`- Giọng điệu: ${brandVoice.tone_of_voice.join(", ")}`);
      }
      if (brandVoice.language_style?.length) {
        parts.push(`- Phong cách ngôn ngữ: ${brandVoice.language_style.join(", ")}`);
      }
      if (brandVoice.formality_level) {
        parts.push(`- Mức độ formal: ${brandVoice.formality_level}`);
      }
      if (brandVoice.brand_positioning) {
        parts.push(`- Định vị: ${brandVoice.brand_positioning}`);
      }
      if (!brandVoice.allow_emoji) {
        parts.push(`- Emoji: KHÔNG SỬ DỤNG`);
      }
      if (brandVoice.preferred_words?.length) {
        parts.push(`- Từ ưu tiên: ${brandVoice.preferred_words.slice(0, 10).join(", ")}`);
      }
      if (brandVoice.forbidden_words?.length) {
        parts.push(`- Từ CẤM: ${brandVoice.forbidden_words.slice(0, 10).join(", ")}`);
      }
      if (brandVoice.compliance_rules?.length) {
        parts.push(`- Quy tắc tuân thủ:\n  + ${brandVoice.compliance_rules.slice(0, 5).join("\n  + ")}`);
      }
      
      return parts.length > 0 ? `\n## BRAND VOICE PROFILE\n${parts.join("\n")}` : "";
    };

    const brandVoicePrompt = buildBrandVoicePrompt();

    // Try to fetch system prompt from registry
    let baseSystemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'ai-edit-channel');
      baseSystemPrompt = await promptManager.get('system_edit', {
        channel,
        instruction,
      });
    } catch (err) {
      console.warn('[ai-edit-channel] Failed to fetch prompt from registry, using hardcoded');
    }

    const systemPrompt = baseSystemPrompt || `Bạn là trợ lý AI chỉnh sửa nội dung theo yêu cầu của người dùng.

## BRAND CONTEXT
Brand: ${content.brand_name}
${content.brand_guideline ? `Guideline: ${content.brand_guideline}` : ""}
Topic: ${content.topic}
${content.industry ? `Industry: ${content.industry}` : ""}
${brandVoicePrompt}

${channelRulesPrompt}

## NHIỆM VỤ
1. Nhận nội dung hiện tại và yêu cầu chỉnh sửa từ người dùng
2. Chỉnh sửa nội dung theo ĐÚNG yêu cầu
3. Giữ nguyên format và quy ước của kênh
4. TUÂN THỦ Brand Voice Profile (giọng điệu, từ cấm, quy tắc)
5. Trả về NỘI DUNG ĐÃ CHỈNH SỬA, không giải thích

## KIỂM TRA CUỐI
- Đảm bảo không vượt max length
- Đảm bảo tuân thủ quy tắc emoji/hashtag của kênh
- Đảm bảo KHÔNG dùng từ cấm
- Đảm bảo đúng giọng điệu brand

## ĐIỀU KHÔNG LÀM
- Không giải thích vì sao sửa
- Không thêm bình luận
- Không thay đổi ngoài yêu cầu
- Không dùng từ trong danh sách cấm`;

    const userPrompt = `NỘI DUNG HIỆN TẠI:
---
${currentContent}
---

YÊU CẦU CHỈNH SỬA: ${instruction}

Hãy chỉnh sửa nội dung theo yêu cầu trên, giữ đúng format kênh ${channel}.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "edit_content",
          description: "Return the edited content",
          parameters: {
            type: "object",
            properties: {
              editedContent: {
                type: "string",
                description: "Nội dung đã được chỉnh sửa theo yêu cầu",
              },
            },
            required: ["editedContent"],
          },
        },
      },
    ];

    console.log("Calling Lovable AI for editing...");
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
        tool_choice: { type: "function", function: { name: "edit_content" } },
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
    console.log("AI response received for editing");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "edit_content") {
      throw new Error("Invalid AI response format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    const editedContent = generatedData.editedContent;
    
    if (!editedContent) {
      throw new Error("AI không trả về nội dung");
    }

    console.log("Edited content generated successfully");

    // Non-blocking metrics
    const model = "google/gemini-2.5-flash";
    const inputTokens = estimateTokens(systemPrompt + userPrompt);
    const outputTokens = estimateTokens(editedContent);
    saveMetrics(supabase, {
      traceId: generateTraceId(),
      functionName: 'ai-edit-channel',
      totalDurationMs: 0,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: outputTokens,
      estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
      modelsUsed: { text: model },
      hadError: false,
      contextSources: ['brand'],
      channels: [channel],
      contentId,
      actionType: 'content_edit',
    }).catch(() => {});

    return new Response(JSON.stringify({ editedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-edit-channel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
