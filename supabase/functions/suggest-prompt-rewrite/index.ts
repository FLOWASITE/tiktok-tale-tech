import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { getOutputLanguage, getLanguageConfig, buildLocalizedDateContext } from "../_shared/country-language-map.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromptRewriteSuggestion {
  type: 'add_data' | 'add_urgency' | 'add_emotion' | 'simplify' | 'strengthen_cta' | 'improve_flow';
  label: string;
  suggestion: string;
  reason: string;
}

interface SuggestPromptRewriteRequest {
  promptContent: string;
  promptNumber: number;
  totalPrompts: number;
  videoType?: string;
  characterType?: string;
  scriptPurpose?: string;
  fullScriptContext?: string;
  countryCode?: string;
  outputLanguage?: string;
}

function getLocalizedSystemPrompt(lang: string, currentYear: number): string {
  const prompts: Record<string, string> = {
    vi: `Bạn là chuyên gia viết kịch bản video ngắn với hơn 10 năm kinh nghiệm.
Nhiệm vụ: Phân tích đoạn kịch bản và đưa ra 3-5 gợi ý cải thiện cụ thể.

## THÔNG TIN THỜI GIAN
- Năm hiện tại: ${currentYear}
- Luôn dùng năm ${currentYear} cho số liệu, xu hướng

## NGUYÊN TẮC GỢI Ý
1. Mỗi gợi ý phải CỤ THỂ - viết ra câu thay thế hoàn chỉnh, không chung chung
2. Giữ nguyên phong cách nhân vật và thể loại video
3. Ưu tiên các cải tiến có impact cao:
   - Thêm số liệu cụ thể tăng credibility
   - Tăng urgency nếu là prompt đầu/cuối
   - Thêm emotional hook nếu đoạn khô khan
   - Đơn giản hóa nếu quá phức tạp
   - Cải thiện flow chuyển đoạn`,
    th: `คุณเป็นผู้เชี่ยวชาญด้านการเขียนสคริปต์วิดีโอสั้นที่มีประสบการณ์มากกว่า 10 ปี
ภารกิจ: วิเคราะห์สคริปต์และให้ 3-5 คำแนะนำการปรับปรุงที่เฉพาะเจาะจง

## ข้อมูลเวลา
- ปีปัจจุบัน: ${currentYear}
- ใช้ปี ${currentYear} เสมอสำหรับข้อมูลและแนวโน้ม

## หลักการแนะนำ
1. แต่ละคำแนะนำต้องเฉพาะเจาะจง - เขียนประโยคทดแทนที่สมบูรณ์
2. รักษาสไตล์ของตัวละครและประเภทวิดีโอ
3. ให้ความสำคัญกับการปรับปรุงที่มีผลกระทบสูง:
   - เพิ่มข้อมูลเฉพาะเพื่อเพิ่มความน่าเชื่อถือ
   - เพิ่ม urgency ถ้าเป็น prompt แรก/สุดท้าย
   - เพิ่ม emotional hook ถ้าเนื้อหาแห้งแล้ง
   - ทำให้ง่ายขึ้นถ้าซับซ้อนเกินไป
   - ปรับปรุง flow การเชื่อมต่อ`,
    en: `You are an expert short-form video scriptwriter with over 10 years of experience.
Task: Analyze the script segment and provide 3-5 specific improvement suggestions.

## TIME CONTEXT
- Current year: ${currentYear}
- Always use year ${currentYear} for data, trends

## SUGGESTION PRINCIPLES
1. Each suggestion must be SPECIFIC - write complete replacement sentences
2. Maintain character style and video type
3. Prioritize high-impact improvements:
   - Add specific data to increase credibility
   - Add urgency for first/last prompts
   - Add emotional hook if content is dry
   - Simplify if too complex
   - Improve transition flow`,
  };
  return prompts[lang] || prompts['en'];
}

function getLocalizedOutputInstruction(lang: string): string {
  const instructions: Record<string, string> = {
    vi: `## OUTPUT FORMAT (JSON)
Trả về JSON array với 3-5 suggestions, mỗi suggestion có:
{
  "type": "add_data" | "add_urgency" | "add_emotion" | "simplify" | "strengthen_cta" | "improve_flow",
  "label": "Tên ngắn gọn của gợi ý (2-4 từ)",
  "suggestion": "Câu viết lại hoàn chỉnh có thể thay thế ngay",
  "reason": "Lý do tại sao cải thiện này hiệu quả (1 câu)"
}

CHỈ TRẢ VỀ JSON ARRAY, KHÔNG CÓ TEXT KHÁC.`,
    th: `## OUTPUT FORMAT (JSON)
ส่งกลับ JSON array ที่มี 3-5 suggestions แต่ละ suggestion มี:
{
  "type": "add_data" | "add_urgency" | "add_emotion" | "simplify" | "strengthen_cta" | "improve_flow",
  "label": "ชื่อสั้นๆ ของคำแนะนำ (2-4 คำ)",
  "suggestion": "ประโยคที่เขียนใหม่สมบูรณ์พร้อมใช้แทน",
  "reason": "เหตุผลว่าทำไมการปรับปรุงนี้จึงมีประสิทธิภาพ (1 ประโยค)"
}

ส่งกลับเฉพาะ JSON ARRAY เท่านั้น ไม่มีข้อความอื่น`,
    en: `## OUTPUT FORMAT (JSON)
Return a JSON array with 3-5 suggestions, each having:
{
  "type": "add_data" | "add_urgency" | "add_emotion" | "simplify" | "strengthen_cta" | "improve_flow",
  "label": "Short suggestion name (2-4 words)",
  "suggestion": "Complete rewritten sentence ready to replace",
  "reason": "Why this improvement is effective (1 sentence)"
}

RETURN JSON ARRAY ONLY, NO OTHER TEXT.`,
  };
  return instructions[lang] || instructions['en'];
}

function getLocalizedPositionLabel(lang: string, promptNumber: number, totalPrompts: number): string {
  if (lang === 'vi') {
    return promptNumber === 1 ? 'HOOK (mở đầu)' : promptNumber === totalPrompts ? 'CTA (kết thúc)' : 'BODY (thân bài)';
  } else if (lang === 'th') {
    return promptNumber === 1 ? 'HOOK (เปิดเรื่อง)' : promptNumber === totalPrompts ? 'CTA (ปิดท้าย)' : 'BODY (เนื้อหา)';
  }
  return promptNumber === 1 ? 'HOOK (opening)' : promptNumber === totalPrompts ? 'CTA (closing)' : 'BODY (main content)';
}

Deno.serve(withPerf({ functionName: 'suggest-prompt-rewrite', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      promptContent, promptNumber, totalPrompts,
      videoType, characterType, scriptPurpose, fullScriptContext,
      countryCode, outputLanguage
    }: SuggestPromptRewriteRequest = await req.json();

    if (!promptContent) {
      return new Response(
        JSON.stringify({ error: 'Prompt content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lang = outputLanguage || getOutputLanguage(countryCode);
    const langConfig = getLanguageConfig(lang);

    // Get local time for date context
    const now = new Date();
    const localTime = new Date(now.getTime() + langConfig.timezoneOffsetHours * 60 * 60 * 1000);
    const currentYear = localTime.getUTCFullYear();

    const systemPrompt = getLocalizedSystemPrompt(lang, currentYear) + '\n\n' + getLocalizedOutputInstruction(lang);

    const positionLabel = getLocalizedPositionLabel(lang, promptNumber, totalPrompts);
    const contextLabel = lang === 'vi' ? 'NỘI DUNG CẦN CẢI THIỆN' : lang === 'th' ? 'เนื้อหาที่ต้องปรับปรุง' : 'CONTENT TO IMPROVE';
    const fullContextLabel = lang === 'vi' ? 'CONTEXT TOÀN BỘ KỊCH BẢN' : lang === 'th' ? 'บริบทสคริปต์ทั้งหมด' : 'FULL SCRIPT CONTEXT';
    const suggestLabel = lang === 'vi' ? 'Hãy đưa ra 3-5 gợi ý cải thiện cụ thể cho đoạn này.' : lang === 'th' ? 'ให้ 3-5 คำแนะนำการปรับปรุงเฉพาะเจาะจงสำหรับส่วนนี้' : 'Provide 3-5 specific improvement suggestions for this segment.';

    const userPrompt = `## CONTEXT
- Prompt: ${promptNumber}/${totalPrompts}
- Position: ${positionLabel}
${videoType ? `- Video type: ${videoType}` : ''}
${characterType ? `- Character: ${characterType}` : ''}
${scriptPurpose ? `- Purpose: ${scriptPurpose}` : ''}

## ${contextLabel}
${promptContent}

${fullScriptContext ? `## ${fullContextLabel}\n${fullScriptContext.substring(0, 1000)}...` : ''}

${suggestLabel}`;

    console.log('[suggest-prompt-rewrite] Generating suggestions for prompt', promptNumber, 'lang:', lang);

    const aiConfig = await getAIConfig('suggest-prompt-rewrite');
    const model = aiConfig?.model || 'google/gemini-2.5-flash';

    // Need supabase for metrics tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const aiResult = await callAIWithMetrics(supabase, {
      functionName: 'suggest-prompt-rewrite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      modelOverride: model,
      temperatureOverride: aiConfig?.temperature || 0.7,
    });

    if (!aiResult.success) {
      console.error('[suggest-prompt-rewrite] AI error:', aiResult.error);
      throw new Error(aiResult.error || 'AI call failed');
    }

    const content = aiResult.data?.choices?.[0]?.message?.content || '';

    let suggestions: PromptRewriteSuggestion[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('[suggest-prompt-rewrite] Parse error:', parseError);
      suggestions = [
        {
          type: 'add_data',
          label: lang === 'vi' ? 'Thêm số liệu' : lang === 'th' ? 'เพิ่มข้อมูล' : 'Add data',
          suggestion: promptContent.replace(/nhiều người/g, '73% người'),
          reason: lang === 'vi' ? 'Số liệu cụ thể tăng độ tin cậy' : lang === 'th' ? 'ข้อมูลเฉพาะเพิ่มความน่าเชื่อถือ' : 'Specific data increases credibility'
        },
        {
          type: 'add_urgency',
          label: lang === 'vi' ? 'Tăng urgency' : lang === 'th' ? 'เพิ่ม urgency' : 'Add urgency',
          suggestion: `${promptContent} - ${lang === 'vi' ? 'Đừng bỏ lỡ!' : lang === 'th' ? 'อย่าพลาด!' : "Don't miss out!"}`,
          reason: lang === 'vi' ? 'Tạo cảm giác cấp bách thúc đẩy hành động' : lang === 'th' ? 'สร้างความเร่งด่วนกระตุ้นการดำเนินการ' : 'Creates urgency that drives action'
        }
      ];
    }

    console.log('[suggest-prompt-rewrite] Generated', suggestions.length, 'suggestions');

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[suggest-prompt-rewrite] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isPayment = /payment required|not enough credits|402/i.test(message);
    const isRateLimit = /rate limit|429|too many requests/i.test(message);

    if (isPayment || isRateLimit) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          fallback: true,
          errorCode: isPayment ? 'CREDITS_EXHAUSTED' : 'RATE_LIMIT',
          error: isPayment
            ? 'Đã hết AI credits. Vui lòng nâng cấp hoặc chờ reset.'
            : 'Đã đạt giới hạn request. Vui lòng thử lại sau.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: message, suggestions: [], fallback: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
