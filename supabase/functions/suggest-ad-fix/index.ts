import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { getOutputLanguage, getLanguageConfig } from "../_shared/country-language-map.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  text: string;
  field: string;
  platform: string;
  issues: {
    ruleId: string;
    ruleName: string;
    message: string;
    severity: string;
    fixHint?: string;
  }[];
  countryCode?: string;
  outputLanguage?: string;
}

function getLocalizedSystemPrompt(lang: string): string {
  const prompts: Record<string, string> = {
    vi: `Bạn là chuyên gia viết quảng cáo (copywriter) với kinh nghiệm sâu về các nền tảng quảng cáo số.
Nhiệm vụ: Sửa lại nội dung quảng cáo để tuân thủ chính sách và tối ưu hiệu quả.

Nguyên tắc:
1. Giữ nguyên ý nghĩa và thông điệp cốt lõi
2. Sửa tất cả các vấn đề được nêu
3. Giữ độ dài tương đương hoặc ngắn hơn
4. Tối ưu cho nền tảng quảng cáo
5. Dùng ngôn ngữ tự nhiên, không gượng gạo`,
    th: `คุณเป็นผู้เชี่ยวชาญด้านการเขียนโฆษณา (copywriter) ที่มีประสบการณ์ลึกซึ้งเกี่ยวกับแพลตฟอร์มโฆษณาดิจิทัล
ภารกิจ: แก้ไขเนื้อหาโฆษณาให้สอดคล้องกับนโยบายและเพิ่มประสิทธิภาพ

หลักการ:
1. รักษาความหมายและข้อความหลัก
2. แก้ไขปัญหาทั้งหมดที่ระบุ
3. รักษาความยาวเท่าเดิมหรือสั้นลง
4. เพิ่มประสิทธิภาพสำหรับแพลตฟอร์มโฆษณา
5. ใช้ภาษาที่เป็นธรรมชาติ ไม่เก้ๆ กังๆ`,
    en: `You are an expert advertising copywriter with deep experience across digital ad platforms.
Task: Rewrite ad content to comply with policies and optimize performance.

Principles:
1. Preserve the core meaning and message
2. Fix all stated issues
3. Keep similar or shorter length
4. Optimize for the ad platform
5. Use natural, fluid language`,
  };
  return prompts[lang] || prompts['en'];
}

function getLocalizedUserPrompt(lang: string, field: string, text: string, issueDescriptions: string): string {
  const templates: Record<string, string> = {
    vi: `Nội dung gốc (${field}):
"${text}"

Các vấn đề cần sửa:
${issueDescriptions}

Hãy viết lại nội dung đã sửa và giải thích ngắn gọn những thay đổi.`,
    th: `เนื้อหาต้นฉบับ (${field}):
"${text}"

ปัญหาที่ต้องแก้ไข:
${issueDescriptions}

เขียนเนื้อหาที่แก้ไขแล้วและอธิบายการเปลี่ยนแปลงสั้นๆ`,
    en: `Original content (${field}):
"${text}"

Issues to fix:
${issueDescriptions}

Rewrite the fixed content and briefly explain the changes.`,
  };
  return templates[lang] || templates['en'];
}

function getLocalizedToolDescription(lang: string) {
  const descriptions: Record<string, { suggestion: string; explanation: string; functionDesc: string }> = {
    vi: {
      suggestion: 'Nội dung quảng cáo đã sửa, tuân thủ chính sách',
      explanation: 'Giải thích ngắn gọn về các thay đổi (1-2 câu)',
      functionDesc: 'Đề xuất nội dung đã sửa và giải thích',
    },
    th: {
      suggestion: 'เนื้อหาโฆษณาที่แก้ไขแล้ว สอดคล้องกับนโยบาย',
      explanation: 'คำอธิบายสั้นๆ เกี่ยวกับการเปลี่ยนแปลง (1-2 ประโยค)',
      functionDesc: 'เสนอเนื้อหาที่แก้ไขแล้วพร้อมคำอธิบาย',
    },
    en: {
      suggestion: 'Fixed ad content, compliant with policies',
      explanation: 'Brief explanation of changes (1-2 sentences)',
      functionDesc: 'Provide fix suggestion with explanation',
    },
  };
  return descriptions[lang] || descriptions['en'];
}

Deno.serve(withPerf({ functionName: 'suggest-ad-fix', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { text, field, platform, issues, countryCode, outputLanguage }: FixRequest = await req.json();
    const lang = outputLanguage || getOutputLanguage(countryCode);

    if (!text || !issues || issues.length === 0) {
      return new Response(
        JSON.stringify({ suggestion: text, explanation: lang === 'vi' ? 'Không có vấn đề cần sửa' : lang === 'th' ? 'ไม่มีปัญหาที่ต้องแก้ไข' : 'No issues to fix' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issueDescriptions = issues.map(i => 
      `- ${i.ruleName}: ${i.message}${i.fixHint ? ` (Hint: ${i.fixHint})` : ''}`
    ).join('\n');

    const platformNames: Record<string, string> = {
      'meta_feed': 'Facebook/Instagram Feed',
      'meta_story': 'Facebook/Instagram Story',
      'google_rsa': 'Google Responsive Search Ads',
      'tiktok': 'TikTok Ads',
      'zalo': 'Zalo OA Ads',
      'linkedin': 'LinkedIn Ads',
      'line': 'LINE Ads',
    };

    // Try to fetch system prompt from registry with fallback
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await resolveUserId(req, supabase);


    let systemPrompt = '';
    try {
      const promptManager = createPromptManager(supabase, 'suggest-ad-fix');
      systemPrompt = await promptManager.get('system_fix', { 
        field,
        platform,
        issues: JSON.stringify(issues.map(i => i.ruleName))
      });
      console.log('[suggest-ad-fix] Using prompt from registry');
    } catch (err) {
      console.warn('[suggest-ad-fix] Failed to fetch prompt from registry, using hardcoded fallback');
    }

    const platformLabel = platformNames[platform] || platform;
    const optimizeForLabel = lang === 'vi' ? `Tối ưu cho nền tảng ${platformLabel}` 
      : lang === 'th' ? `เพิ่มประสิทธิภาพสำหรับแพลตฟอร์ม ${platformLabel}`
      : `Optimize for ${platformLabel}`;
    const finalSystemPrompt = (systemPrompt || getLocalizedSystemPrompt(lang)) + `\n${optimizeForLabel}`;

    const userPrompt = getLocalizedUserPrompt(lang, field, text, issueDescriptions);
    const toolDesc = getLocalizedToolDescription(lang);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_fix_suggestion',
              description: toolDesc.functionDesc,
              parameters: {
                type: 'object',
                properties: {
                  suggestion: { type: 'string', description: toolDesc.suggestion },
                  explanation: { type: 'string', description: toolDesc.explanation },
                },
                required: ['suggestion', 'explanation'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_fix_suggestion' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[suggest-ad-fix] AI error:', response.status, errorText);
      throw new Error(`AI call failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== 'provide_fix_suggestion') {
      throw new Error('Unexpected AI response format');
    }

    const result = JSON.parse(toolCall.function.arguments);

    console.log('[suggest-ad-fix] Success:', { 
      lang,
      original: text.slice(0, 50), 
      suggestion: result.suggestion.slice(0, 50) 
    });

    // Non-blocking metrics
    const model = "google/gemini-2.5-flash";
    const inputTokens = estimateTokens(finalSystemPrompt + userPrompt);
    const outputTokens = estimateTokens(JSON.stringify(result));
    saveMetrics(supabase, {
      traceId: generateTraceId(),
      functionName: 'suggest-ad-fix',
      userId,
      totalDurationMs: 0,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: outputTokens,
      estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
      modelsUsed: { text: model },
      hadError: false,
      contextSources: [],
      actionType: 'content_edit',
    }).catch(() => {});

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-ad-fix] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
