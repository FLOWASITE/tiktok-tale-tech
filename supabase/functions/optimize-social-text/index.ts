import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'optimize-social-text' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, maxLength = 60, style = 'punchy' } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If text is already short enough, return as-is
    if (text.length <= maxLength) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          optimizedText: text.trim(),
          wasOptimized: false,
          originalLength: text.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const styleInstructions: Record<string, string> = {
      'punchy': 'Make it punchy, bold, and attention-grabbing. Use power words.',
      'elegant': 'Make it elegant, sophisticated, and refined. Keep it classy.',
      'minimal': 'Make it ultra-minimal. Strip to bare essence.',
      'emotional': 'Make it emotional and evocative. Touch the heart.',
    };

    const systemPrompt = `You are a copywriting expert specializing in social media graphics.
Your job is to compress long text into SHORT, IMPACTFUL phrases for image overlays.

RULES:
1. Maximum ${maxLength} characters (STRICT LIMIT)
2. ${styleInstructions[style] || styleInstructions['punchy']}
3. Preserve the core message and emotional impact
4. Remove filler words, keep only essential meaning
5. Use line breaks (\\n) if it helps readability (max 2 lines)
6. Output ONLY the optimized text, nothing else

Examples:
- "3 sai lầm skincare khiến da bạn ngày càng tệ hơn mà bạn không hề biết" → "3 sai lầm\\nskincare chết người"
- "Bí quyết giúp bạn tăng doanh số bán hàng lên 200% chỉ trong 30 ngày" → "Tăng 200% doanh số\\ntrong 30 ngày"
- "Tại sao những người thành công luôn thức dậy lúc 5 giờ sáng" → "Bí mật 5AM\\ncủa người thành công"`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Optimize this text for a social graphic overlay:\n\n"${text}"` }
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to optimize text with AI');
    }

    const data = await response.json();
    const optimizedText = data.choices?.[0]?.message?.content?.trim() || text;

    // Clean up any quotes that AI might add
    const cleanedText = optimizedText
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/^Optimized:?\s*/i, '') // Remove "Optimized:" prefix
      .replace(/\\n/g, '\n') // Convert literal \n to real newlines
      .replace(/\/n/g, '\n') // Convert /n typo to real newlines
      .trim();

    console.log('[optimize-social-text] Original:', text.length, 'chars → Optimized:', cleanedText.length, 'chars');

    return new Response(
      JSON.stringify({
        success: true,
        optimizedText: cleanedText,
        wasOptimized: true,
        originalLength: text.length,
        optimizedLength: cleanedText.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[optimize-social-text] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to optimize text';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
