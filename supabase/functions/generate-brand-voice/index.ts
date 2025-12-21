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
    const { description, industry, generateGuideline } = await req.json();
    
    // Validate: require at least 1 meaningful word (min 2 characters)
    const trimmedDesc = (description || '').trim();
    if (trimmedDesc.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Vui lòng nhập mô tả sản phẩm/dịch vụ của bạn' }),
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

Lưu ý quan trọng:
- suggested_brand_name: Gợi ý 1 tên thương hiệu phù hợp với mô tả (có thể là tiếng Việt hoặc tiếng Anh, 2-4 từ, dễ nhớ)
- suggested_industry: Chọn 1 ngành phù hợp nhất từ: Tài chính & Kế toán, Bất động sản, F&B, Công nghệ thông tin, Giáo dục & Đào tạo, Y tế & Sức khỏe, Du lịch & Khách sạn, Thương mại điện tử, Marketing & Truyền thông, Thời trang & Làm đẹp, hoặc ngành khác phù hợp
- tone_of_voice: Chọn 2-4 giá trị phù hợp nhất từ: professional, friendly, authoritative, playful, empathetic, inspirational, educational, conversational
- language_style: Chọn 2-3 giá trị phù hợp nhất từ: simple, technical, storytelling, data_driven, emotional, humorous, direct, poetic
- preferred_words: Đề xuất 5-10 từ/cụm từ đặc trưng cho ngành (tiếng Việt)
- forbidden_words: Đề xuất 3-5 từ nên tránh (tiếng Việt)
- Trả lời bằng tiếng Việt cho các trường text tự do`;

    const userPrompt = `Phân tích và đề xuất Brand Voice cho sản phẩm/dịch vụ sau:

Mô tả: ${description}
${industry ? `Ngành nghề: ${industry}` : ''}

Hãy sử dụng function suggest_brand_voice để trả về kết quả.`;

    console.log("Calling Lovable AI for brand voice generation with tool calling...");

    // Use tool calling to ensure structured JSON output
    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_brand_voice",
          description: "Đề xuất Brand Voice dựa trên mô tả sản phẩm/dịch vụ",
          parameters: {
            type: "object",
            properties: {
              suggested_brand_name: {
                type: "string",
                description: "Tên thương hiệu gợi ý (ngắn gọn, dễ nhớ, 2-4 từ)"
              },
              suggested_industry: {
                type: "string",
                description: "Ngành nghề phù hợp nhất"
              },
              brand_positioning: {
                type: "string",
                description: "Câu định vị thương hiệu ngắn gọn (1-2 câu, tiếng Việt)"
              },
              tone_of_voice: {
                type: "array",
                items: { type: "string" },
                description: "Danh sách 2-4 tone phù hợp"
              },
              formality_level: {
                type: "string",
                enum: ["formal", "semi_formal", "casual", "friendly"],
                description: "Mức độ trang trọng"
              },
              language_style: {
                type: "array",
                items: { type: "string" },
                description: "Danh sách 2-3 phong cách ngôn ngữ"
              },
              preferred_words: {
                type: "array",
                items: { type: "string" },
                description: "5-10 từ/cụm từ nên dùng (tiếng Việt)"
              },
              forbidden_words: {
                type: "array",
                items: { type: "string" },
                description: "3-5 từ nên tránh (tiếng Việt)"
              },
              allow_emoji: {
                type: "boolean",
                description: "Có cho phép dùng emoji không"
              },
              reasoning: {
                type: "string",
                description: "Giải thích ngắn gọn lý do cho các đề xuất (tiếng Việt)"
              }
            },
            required: [
              "suggested_brand_name",
              "suggested_industry", 
              "brand_positioning",
              "tone_of_voice",
              "formality_level",
              "language_style",
              "preferred_words",
              "forbidden_words",
              "allow_emoji",
              "reasoning"
            ],
            additionalProperties: false
          }
        }
      }
    ];

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
        tools,
        tool_choice: { type: "function", function: { name: "suggest_brand_voice" } },
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
    console.log("AI response received:", JSON.stringify(data).slice(0, 500));
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "suggest_brand_voice") {
      // Fallback: try to parse content as JSON
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
          const suggestions = JSON.parse(jsonStr);
          console.log("Brand voice generated from content fallback");
          return new Response(
            JSON.stringify({ suggestions }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch {
          console.error("No valid tool call or parseable content in response");
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'AI không thể tạo đề xuất. Vui lòng mô tả chi tiết hơn về sản phẩm/dịch vụ của bạn.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let suggestions;
    try {
      suggestions = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool call arguments:", parseError, toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Brand voice generated successfully via tool call");

    // If generateGuideline was requested, also return the reasoning as guideline
    if (generateGuideline && suggestions.reasoning) {
      return new Response(
        JSON.stringify({ suggestions, guideline: suggestions.reasoning }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
