import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";

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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { text, field, platform, issues }: FixRequest = await req.json();

    if (!text || !issues || issues.length === 0) {
      return new Response(
        JSON.stringify({ suggestion: text, explanation: 'Không có vấn đề cần sửa' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issueDescriptions = issues.map(i => 
      `- ${i.ruleName}: ${i.message}${i.fixHint ? ` (Gợi ý: ${i.fixHint})` : ''}`
    ).join('\n');

    const platformNames: Record<string, string> = {
      'meta_feed': 'Facebook/Instagram Feed',
      'meta_story': 'Facebook/Instagram Story',
      'google_rsa': 'Google Responsive Search Ads',
      'tiktok': 'TikTok Ads',
      'zalo': 'Zalo OA Ads',
      'linkedin': 'LinkedIn Ads',
    };

    // Try to fetch system prompt from registry with fallback
    const FALLBACK_SYSTEM = `Bạn là chuyên gia viết quảng cáo (copywriter) với kinh nghiệm sâu về các nền tảng quảng cáo số.
Nhiệm vụ: Sửa lại nội dung quảng cáo để tuân thủ chính sách và tối ưu hiệu quả.

Nguyên tắc:
1. Giữ nguyên ý nghĩa và thông điệp cốt lõi
2. Sửa tất cả các vấn đề được nêu
3. Giữ độ dài tương đương hoặc ngắn hơn
4. Tối ưu cho nền tảng quảng cáo
5. Dùng ngôn ngữ tự nhiên, không gượng gạo`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const finalSystemPrompt = (systemPrompt || FALLBACK_SYSTEM) + `\nTối ưu cho nền tảng ${platformNames[platform] || platform}`;

    const userPrompt = `Nội dung gốc (${field}):
"${text}"

Các vấn đề cần sửa:
${issueDescriptions}

Hãy viết lại nội dung đã sửa và giải thích ngắn gọn những thay đổi.`;

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
              description: 'Đề xuất nội dung đã sửa và giải thích',
              parameters: {
                type: 'object',
                properties: {
                  suggestion: {
                    type: 'string',
                    description: 'Nội dung quảng cáo đã sửa, tuân thủ chính sách',
                  },
                  explanation: {
                    type: 'string',
                    description: 'Giải thích ngắn gọn về các thay đổi (1-2 câu)',
                  },
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
      original: text.slice(0, 50), 
      suggestion: result.suggestion.slice(0, 50) 
    });

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
});
