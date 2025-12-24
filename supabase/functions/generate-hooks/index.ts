import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrandVoice {
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
  brand_name?: string;
}

interface GenerateHooksRequest {
  topic: string;
  brandVoice?: BrandVoice;
  platform?: string;
  duration?: string;
  count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, brandVoice, platform, duration, count = 5 } = await req.json() as GenerateHooksRequest;
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build brand voice context
    let brandContext = '';
    if (brandVoice) {
      const parts = [];
      if (brandVoice.brand_name) parts.push(`Brand: ${brandVoice.brand_name}`);
      if (brandVoice.tone_of_voice?.length) parts.push(`Tone: ${brandVoice.tone_of_voice.join(', ')}`);
      if (brandVoice.formality_level) parts.push(`Formality: ${brandVoice.formality_level}`);
      if (brandVoice.brand_positioning) parts.push(`Positioning: ${brandVoice.brand_positioning}`);
      if (brandVoice.preferred_words?.length) parts.push(`Preferred words: ${brandVoice.preferred_words.join(', ')}`);
      if (brandVoice.forbidden_words?.length) parts.push(`Avoid words: ${brandVoice.forbidden_words.join(', ')}`);
      
      if (parts.length > 0) {
        brandContext = `\n\nBrand Voice Guidelines:\n${parts.join('\n')}`;
      }
    }

    const platformContext = platform ? `\nTarget Platform: ${platform}` : '';
    const durationContext = duration ? `\nVideo Duration: ${duration}` : '';

    const systemPrompt = `Bạn là chuyên gia sáng tạo nội dung video ngắn với 10+ năm kinh nghiệm. 
Nhiệm vụ của bạn là tạo ra các HOOK (câu mở đầu) hấp dẫn để thu hút người xem trong 3 giây đầu tiên.

Mỗi hook cần có:
1. opening_line: Câu nói đầu tiên (trong 3 giây đầu)
2. visual_direction: Hướng dẫn hình ảnh trên màn hình
3. text_overlay: Text hiển thị trên video
4. framework: Loại hook (question, bold_statement, transformation, story, number, negative, social_proof, direct_address, shocking_fact, challenge)
5. psychology_reason: Giải thích tại sao hook này hiệu quả (tâm lý học)
6. engagement_level: Dự đoán mức độ engagement (high, medium, low)${brandContext}${platformContext}${durationContext}

QUAN TRỌNG:
- Hook phải bằng tiếng Việt
- Phải gây tò mò hoặc shock để dừng scroll
- Phù hợp với Brand Voice nếu được cung cấp
- Không sử dụng từ cấm (forbidden words) nếu có`;

    const userPrompt = `Tạo ${count} hook variations khác nhau cho chủ đề: "${topic}"

Trả về JSON array với format:
[
  {
    "opening_line": "...",
    "visual_direction": "...",
    "text_overlay": "...",
    "framework": "question|bold_statement|transformation|story|number|negative|social_proof|direct_address|shocking_fact|challenge",
    "psychology_reason": "...",
    "engagement_level": "high|medium|low"
  }
]`;

    console.log('[generate-hooks] Calling AI with topic:', topic);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-hooks] AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate hooks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[generate-hooks] No content in response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response
    let hooks;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      hooks = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[generate-hooks] Failed to parse response:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-hooks] Successfully generated', hooks.length, 'hooks');

    return new Response(
      JSON.stringify({ hooks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-hooks] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
