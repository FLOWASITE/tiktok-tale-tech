import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withCache, CACHE_TTL, CACHE_SCOPE } from "../_shared/cache-utils.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types mirroring src/types/channelSettings.ts
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
  tone_adjustment: 'keep' | 'shorten' | 'concise';
  format_type?: 'markdown' | 'plain' | 'thread' | 'notification';
  format_description?: string;
}

type Channel = 'website' | 'facebook' | 'instagram' | 'twitter' | 'google_maps' | 'linkedin' | 'email' | 'youtube' | 'zalo_oa' | 'telegram' | 'tiktok' | 'threads';

type ChannelOverride = Partial<ChannelSettings>;
type ChannelOverrides = Partial<Record<Channel, ChannelOverride>>;

// Default settings for each channel
const DEFAULT_CHANNEL_SETTINGS: Record<Channel, ChannelSettings> = {
  website: {
    min_length: 800, max_length: 1500, length_unit: 'words',
    hook_required: false, hook_style: 'không cần giật tít',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    tone_adjustment: 'keep', format_type: 'markdown',
    format_description: 'Cấu trúc H1–H3 rõ ràng, Markdown format',
  },
  facebook: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: true, hook_style: 'BẮT BUỘC 2 dòng đầu là hook mạnh',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 3,
    hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'short', link_position: 'body',
    tone_adjustment: 'keep', format_type: 'plain',
    format_description: 'Xuống dòng ngắn, chia đoạn 2-3 dòng',
  },
  instagram: {
    min_length: 50, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'hook ngắn gọn',
    bullet_allowed: false, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 5,
    hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'many', link_position: 'none',
    tone_adjustment: 'concise', format_type: 'plain',
    format_description: 'Nhiều xuống dòng, KHÔNG chèn hashtag trong body',
  },
  twitter: {
    min_length: 150, max_length: 350, length_unit: 'words',
    hook_required: true, hook_style: 'quan điểm ngay câu đầu',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 2, hashtag_position: 'end',
    line_break_style: 'minimal', link_position: 'allowed',
    tone_adjustment: 'concise', format_type: 'thread',
    format_description: 'Thread 5-7 tweets đánh số (1/, 2/...), mỗi tweet ≤280 ký tự, KHÔNG emoji, hashtag cuối thread',
  },
  google_maps: {
    min_length: 80, max_length: 150, length_unit: 'words',
    hook_required: false, hook_style: 'không',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'none',
    tone_adjustment: 'keep', format_type: 'plain',
    format_description: 'Thực tế, xác thực, khách quan',
  },
  linkedin: {
    min_length: 300, max_length: 600, length_unit: 'words',
    hook_required: true, hook_style: 'nhẹ, không giật tít',
    bullet_allowed: true, cta_policy: 'soft',
    emoji_allowed: true, emoji_limit: 2,
    hashtag_limit: 3, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'allowed',
    tone_adjustment: 'keep', format_type: 'plain',
    format_description: 'Chuyên nghiệp, rõ đoạn, B2B authority',
  },
  email: {
    min_length: 250, max_length: 500, length_unit: 'words',
    hook_required: false, bullet_allowed: true,
    cta_policy: 'required', has_subject_line: true,
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'body',
    tone_adjustment: 'keep', format_type: 'plain',
    format_description: 'Có Subject line, đoạn ngắn, dễ đọc, CTA rõ nhưng không spam',
  },
  youtube: {
    min_length: 500, max_length: 800, length_unit: 'words',
    hook_required: true, hook_style: 'hook 5 giây đầu',
    bullet_allowed: true, cta_policy: 'required',
    emoji_allowed: true, emoji_limit: 3,
    hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'normal', link_position: 'body',
    tone_adjustment: 'keep', format_type: 'markdown',
    format_description: 'Script 3-5 phút với Hook + Intro + Content + CTA + Outro',
  },
  zalo_oa: {
    min_length: 60, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'trực diện, không giật tít',
    bullet_allowed: false, cta_policy: 'required',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'short', link_position: 'allowed',
    tone_adjustment: 'concise', format_type: 'notification',
    format_description: 'Thông báo rõ việc, thân thiện local',
  },
  telegram: {
    min_length: 200, max_length: 500, length_unit: 'words',
    hook_required: false, hook_style: 'không cần giật',
    bullet_allowed: true, cta_policy: 'optional',
    emoji_allowed: false, emoji_limit: 0,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'allowed',
    tone_adjustment: 'keep', format_type: 'plain',
    format_description: 'Bullet, dễ đọc, linh hoạt',
  },
  tiktok: {
    min_length: 50, max_length: 150, length_unit: 'words',
    hook_required: true, hook_style: 'Hook 3 giây đầu GÂY SỐC hoặc GÂY TÒ MÒ',
    bullet_allowed: false, cta_policy: 'optional',
    emoji_allowed: true, emoji_limit: 5,
    hashtag_limit: 5, hashtag_position: 'end',
    line_break_style: 'short', link_position: 'none',
    tone_adjustment: 'concise', format_type: 'plain',
    format_description: 'Script video ngắn 15-60s, câu ngắn, action-oriented, trending hashtag',
  },
  threads: {
    min_length: 0, max_length: 500, length_unit: 'chars',
    hook_required: true, hook_style: 'Mở đầu với quan điểm mạnh hoặc câu hỏi',
    bullet_allowed: false, cta_policy: 'none',
    emoji_allowed: true, emoji_limit: 3,
    hashtag_limit: 0, hashtag_position: 'none',
    line_break_style: 'normal', link_position: 'none',
    tone_adjustment: 'concise', format_type: 'plain',
    format_description: 'Text thuần, casual, conversational, không hashtag',
  },
};

// Build channel rules prompt for AI
function buildChannelRulesPrompt(
  channel: Channel,
  settings: ChannelSettings,
  brandAllowEmoji: boolean
): string {
  const parts: string[] = [];
  
  parts.push(`### ${channel.toUpperCase()}`);
  
  const lengthLabel = settings.length_unit === 'chars' ? 'ký tự' : 'chữ';
  if (settings.min_length) {
    parts.push(`- Độ dài: ${settings.min_length}–${settings.max_length} ${lengthLabel}`);
  } else {
    parts.push(`- Độ dài: Tối đa ${settings.max_length} ${lengthLabel}`);
  }
  
  if (settings.hook_required) {
    parts.push(`- Hook: ${settings.hook_style || 'BẮT BUỘC'}`);
  } else {
    parts.push(`- Hook: ${settings.hook_style || 'Không bắt buộc'}`);
  }
  
  const ctaLabels: Record<string, string> = {
    required: 'Bắt buộc, rõ ràng',
    soft: 'Có nhưng mềm, không bán',
    optional: 'Tuỳ chọn',
    none: 'Không có CTA bán hàng',
  };
  parts.push(`- CTA: ${ctaLabels[settings.cta_policy] || settings.cta_policy}`);
  
  if (!brandAllowEmoji) {
    parts.push(`- Emoji: KHÔNG (Brand Voice yêu cầu)`);
  } else if (settings.emoji_allowed) {
    parts.push(`- Emoji: Cho phép, tối đa ${settings.emoji_limit || 3}`);
  } else {
    parts.push(`- Emoji: KHÔNG`);
  }
  
  if (settings.hashtag_limit > 0) {
    const posLabel = settings.hashtag_position === 'end' ? 'cuối bài' : 'trong bài';
    parts.push(`- Hashtag: Tối đa ${settings.hashtag_limit}, đặt ${posLabel}`);
  } else {
    parts.push(`- Hashtag: KHÔNG`);
  }
  
  const linkLabels: Record<string, string> = {
    body: 'Cho phép trong bài',
    end: 'Cuối bài',
    allowed: 'Có thể',
    none: 'KHÔNG link',
  };
  parts.push(`- Link: ${linkLabels[settings.link_position] || settings.link_position}`);
  
  if (settings.format_description) {
    parts.push(`- Format: ${settings.format_description}`);
  }
  
  if (settings.has_subject_line) {
    parts.push(`- Bao gồm Subject line hấp dẫn (không spam trigger)`);
  }

  // Line break style
  const lineBreakLabels: Record<string, string> = {
    many: 'Nhiều xuống dòng, thoáng',
    short: 'Xuống dòng thường xuyên, đoạn ngắn 2-3 dòng',
    normal: 'Xuống dòng bình thường theo đoạn',
    minimal: 'Ít xuống dòng, súc tích',
  };
  parts.push(`- Xuống dòng: ${lineBreakLabels[settings.line_break_style] || settings.line_break_style}`);
  
  return parts.join('\n');
}

// Merge default settings with overrides (ALL settings explicitly)
function getMergedSettings(channel: Channel, overrides?: ChannelOverrides): ChannelSettings {
  const defaultSettings = DEFAULT_CHANNEL_SETTINGS[channel];
  const channelOverride = overrides?.[channel];
  
  if (!channelOverride) return defaultSettings;
  
  return {
    ...defaultSettings,
    // Core content settings
    max_length: channelOverride.max_length ?? defaultSettings.max_length,
    min_length: channelOverride.min_length ?? defaultSettings.min_length,
    length_unit: channelOverride.length_unit ?? defaultSettings.length_unit,
    // Hook settings
    hook_required: channelOverride.hook_required ?? defaultSettings.hook_required,
    hook_style: channelOverride.hook_style ?? defaultSettings.hook_style,
    // CTA & formatting
    cta_policy: channelOverride.cta_policy ?? defaultSettings.cta_policy,
    bullet_allowed: channelOverride.bullet_allowed ?? defaultSettings.bullet_allowed,
    line_break_style: channelOverride.line_break_style ?? defaultSettings.line_break_style,
    format_description: channelOverride.format_description ?? defaultSettings.format_description,
    // Emoji & hashtag
    emoji_allowed: channelOverride.emoji_allowed ?? defaultSettings.emoji_allowed,
    emoji_limit: channelOverride.emoji_limit ?? defaultSettings.emoji_limit,
    hashtag_limit: channelOverride.hashtag_limit ?? defaultSettings.hashtag_limit,
    hashtag_position: channelOverride.hashtag_position ?? defaultSettings.hashtag_position,
    // Link & tone
    link_position: channelOverride.link_position ?? defaultSettings.link_position,
    tone_adjustment: channelOverride.tone_adjustment ?? defaultSettings.tone_adjustment,
    // Special
    has_subject_line: channelOverride.has_subject_line ?? defaultSettings.has_subject_line,
  };
}

interface RequestBody {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  channels: string[];
  channelOverrides?: ChannelOverrides;
  organizationId?: string;
  brandTemplateId?: string;
  brandVoiceVersion?: string;
}

interface SampleTextResponse {
  samples: Record<string, string>;
  rulesUsed: Record<string, ChannelSettings>;
}

const FORMALITY_DESCRIPTIONS: Record<string, string> = {
  formal: "very formal and respectful tone",
  very_formal: "extremely formal and ceremonial tone",
  semi_formal: "semi-formal, balanced professional tone",
  casual: "casual and relaxed tone",
  very_casual: "very casual, friendly like talking to a friend",
  friendly: "warm and approachable tone",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "professional and business-oriented",
  friendly: "warm and friendly",
  authoritative: "confident and authoritative",
  playful: "fun and playful",
  empathetic: "understanding and empathetic",
  inspirational: "inspiring and motivational",
  educational: "informative and educational",
  conversational: "conversational like chatting",
};

/**
 * Generate sample text from AI
 */
async function generateFromAI(params: {
  brandName: string;
  positioning?: string;
  toneOfVoice: string[];
  formalityLevel: string;
  allowEmoji: boolean;
  preferredWords: string[];
  forbiddenWords: string[];
  channels: string[];
  channelOverrides?: ChannelOverrides;
}): Promise<SampleTextResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const { 
    brandName, 
    positioning, 
    toneOfVoice, 
    formalityLevel,
    allowEmoji,
    preferredWords,
    forbiddenWords,
    channels,
    channelOverrides,
  } = params;

  // Build the brand voice description
  const toneDesc = toneOfVoice.map(t => TONE_DESCRIPTIONS[t] || t).join(", ");
  const formalityDesc = FORMALITY_DESCRIPTIONS[formalityLevel] || formalityLevel;
  
  const brandContext = `
Brand Name: ${brandName}
${positioning ? `Brand Positioning: ${positioning}` : ""}
Tone of Voice: ${toneDesc || "neutral"}
Formality: ${formalityDesc}
${allowEmoji ? "Emojis are allowed and encouraged where specified" : "Do NOT use any emojis"}
${preferredWords.length > 0 ? `Preferred words to use: ${preferredWords.join(", ")}` : ""}
${forbiddenWords.length > 0 ? `Forbidden words (NEVER use these): ${forbiddenWords.join(", ")}` : ""}
`.trim();

  // Build detailed channel rules using merged settings
  const channelRulesPrompts: string[] = [];
  for (const channel of channels) {
    const mergedSettings = getMergedSettings(channel as Channel, channelOverrides);
    const rulesPrompt = buildChannelRulesPrompt(channel as Channel, mergedSettings, allowEmoji);
    channelRulesPrompts.push(rulesPrompt);
  }

  const systemPrompt = `You are a professional content writer for the brand "${brandName}". 
Write in Vietnamese language.
Follow the brand voice guidelines AND channel-specific rules STRICTLY.
Generate authentic, engaging content that reflects the brand personality.
IMPORTANT: Each channel has specific rules for length, emoji, hashtag, CTA, etc. You MUST follow them exactly.
DO NOT include any meta-commentary or explanations - just the content itself.`;

  const userPrompt = `Based on this brand profile:
${brandContext}

Generate sample content for each channel, following these SPECIFIC RULES for each:

${channelRulesPrompts.join("\n\n")}

IMPORTANT COMPLIANCE REQUIREMENTS:
1. Respect the length limits exactly (min and max)
2. Count emoji and hashtag usage carefully
3. Follow the CTA policy for each channel
4. Use the specified hook style if required
5. Follow the line break and formatting guidelines

Return a JSON object with channel names as keys and the generated content as values.
Example format: {"facebook": "content here...", "linkedin": "content here..."}
Only return the JSON, no other text.`;

  const aiStartTime = performance.now();
  const traceId = generateTraceId();
  const model = "google/gemini-2.5-flash";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits.");
    }
    
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  // Non-blocking metrics save
  const aiDurationMs = Math.round(performance.now() - aiStartTime);
  const inputTokens = data.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt);
  const outputTokens = data.usage?.completion_tokens || estimateTokens(content || '');
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserId(req, supabase);
    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-sample-text',
      userId,
      totalDurationMs: aiDurationMs,
      aiCallDurationMs: aiDurationMs,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: outputTokens,
      estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
      modelsUsed: { text: model },
      hadError: false,
      contextSources: [],
      actionType: 'content_generation',
    }).catch(() => {});
  } catch {}


  if (!content) {
    throw new Error("No content returned from AI");
  }

  // Parse the JSON response
  let samples: Record<string, string>;
  try {
    const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    samples = JSON.parse(cleanContent);
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    samples = {};
    for (const channel of channels) {
      samples[channel] = content;
    }
  }

  // Build rules used for compliance checking
  const rulesUsed: Record<string, ChannelSettings> = {};
  for (const channel of channels) {
    rulesUsed[channel] = getMergedSettings(channel as Channel, channelOverrides);
  }

  return { samples, rulesUsed };
}

Deno.serve(withPerf({ functionName: 'generate-sample-text', slowThresholdMs: 30000 }, async (req) => {
  console.log("generate-sample-text: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    console.log("generate-sample-text: Request body:", JSON.stringify({
      brandName: body.brandName,
      channels: body.channels,
      toneOfVoice: body.toneOfVoice,
      formalityLevel: body.formalityLevel,
      hasChannelOverrides: !!body.channelOverrides,
      organizationId: body.organizationId,
      brandTemplateId: body.brandTemplateId,
    }));
    
    const { 
      brandName, 
      positioning, 
      toneOfVoice = [], 
      formalityLevel = "semi_formal",
      allowEmoji = true,
      preferredWords = [],
      forbiddenWords = [],
      channels,
      channelOverrides,
      organizationId,
      brandTemplateId,
      brandVoiceVersion,
    } = body;

    if (!brandName || !channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ error: "brandName and channels are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use withCache wrapper - use 'global' scope if no organizationId
    const functionName = 'generate-sample-text';
    const scope = organizationId ? (CACHE_SCOPE[functionName] || 'org') : 'global';
    const ttlDays = CACHE_TTL[functionName] || 30;

    // Build cache input (only cacheable fields)
    const cacheInput = {
      brandName,
      positioning,
      toneOfVoice,
      formalityLevel,
      allowEmoji,
      preferredWords,
      forbiddenWords,
      channels,
      channelOverrides,
    };

    const result = await withCache<SampleTextResponse>({
      functionName,
      scope,
      organizationId,
      brandTemplateId,
      input: cacheInput,
      versions: {
        brandVoice: brandVoiceVersion,
      },
      ttlDays,
      generateFn: async () => {
        console.log("generate-sample-text: Cache MISS - calling AI");
        return generateFromAI({
          brandName,
          positioning,
          toneOfVoice,
          formalityLevel,
          allowEmoji,
          preferredWords,
          forbiddenWords,
          channels,
          channelOverrides,
        });
      },
    });

    console.log(`generate-sample-text: Response ${result.fromCache ? 'from CACHE' : 'from AI'}`);

    return new Response(
      JSON.stringify({ 
        samples: result.data.samples, 
        rulesUsed: result.data.rulesUsed,
        fromCache: result.fromCache,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-sample-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
