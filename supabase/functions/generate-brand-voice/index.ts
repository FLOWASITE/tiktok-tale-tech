import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, industry } = await req.json();
    
    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Vui lòng nhập mô tả sản phẩm/dịch vụ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Bạn là chuyên gia về Brand Strategy và Content Marketing. Nhiệm vụ của bạn là phân tích mô tả sản phẩm/dịch vụ và đề xuất Brand Voice phù hợp.

Dựa vào mô tả được cung cấp, hãy đề xuất các thiết lập Brand Voice theo format JSON sau:

{
  "brand_positioning": "Câu định vị thương hiệu ngắn gọn (1-2 câu)",
  "tone_of_voice": ["professional", "friendly", "authoritative", "playful", "empathetic", "inspirational", "educational", "conversational"],
  "formality_level": "formal | semi_formal | casual | friendly",
  "language_style": ["simple", "technical", "storytelling", "data_driven", "emotional", "humorous", "direct", "poetic"],
  "preferred_words": ["từ nên dùng 1", "từ nên dùng 2", ...],
  "forbidden_words": ["từ không dùng 1", "từ không dùng 2", ...],
  "allow_emoji": true | false,
  "reasoning": "Giải thích ngắn gọn lý do cho các đề xuất"
}

Lưu ý:
- tone_of_voice: Chọn 2-4 giá trị phù hợp nhất từ danh sách
- language_style: Chọn 2-3 giá trị phù hợp nhất
- preferred_words: Đề xuất 5-10 từ/cụm từ đặc trưng cho ngành
- forbidden_words: Đề xuất 3-5 từ nên tránh
- Trả lời bằng tiếng Việt cho các trường text tự do`;

    const userPrompt = `Phân tích và đề xuất Brand Voice cho sản phẩm/dịch vụ sau:

Mô tả: ${description}
${industry ? `Ngành nghề: ${industry}` : ''}

Hãy trả về JSON với các đề xuất phù hợp.`;

    console.log("Calling Lovable AI for brand voice generation...");

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Vui lòng nạp thêm credits để sử dụng tính năng AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from the response
    let suggestions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      suggestions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError, content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Brand voice generated successfully");

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-brand-voice function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
