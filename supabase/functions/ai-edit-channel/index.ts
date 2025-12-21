import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

const channelRules: Record<string, string> = {
  website: `WEBSITE/BLOG: 800–1500 chữ, cấu trúc heading H1/H2/H3, Markdown format, KHÔNG emoji`,
  facebook: `FACEBOOK: 120–300 chữ, chia đoạn ngắn, emoji tiết chế (1-3)`,
  instagram: `INSTAGRAM: 50–150 chữ, ngắn gọn, hashtag cuối (3-5)`,
  twitter: `TWITTER: Thread 5-7 tweets, mỗi tweet ≤ 280 ký tự, đánh số 1/, 2/...`,
  google_maps: `GOOGLE MAPS: 80–150 chữ, khách quan, KHÔNG emoji/hashtag`,
};

const channelFieldMap: Record<string, string> = {
  website: "website_content",
  facebook: "facebook_content",
  instagram: "instagram_content",
  twitter: "twitter_content",
  google_maps: "google_maps_content",
};

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

    if (!channelRules[channel]) {
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
      .select("brand_name, brand_guideline, content_goal, topic, industry")
      .eq("id", contentId)
      .single();

    if (fetchError || !content) {
      console.error("Fetch error:", fetchError);
      throw new Error("Không tìm thấy nội dung");
    }

    const systemPrompt = `Bạn là trợ lý AI chỉnh sửa nội dung theo yêu cầu của người dùng.

## BRAND CONTEXT
Brand: ${content.brand_name}
${content.brand_guideline ? `Guideline: ${content.brand_guideline}` : ""}
Topic: ${content.topic}
${content.industry ? `Industry: ${content.industry}` : ""}

## QUY ƯỚC KÊNH ${channel.toUpperCase()}
${channelRules[channel]}

## NHIỆM VỤ
1. Nhận nội dung hiện tại và yêu cầu chỉnh sửa từ người dùng
2. Chỉnh sửa nội dung theo ĐÚNG yêu cầu
3. Giữ nguyên format và quy ước của kênh
4. Trả về NỘI DUNG ĐÃ CHỈNH SỬA, không giải thích

## ĐIỀU KHÔNG LÀM
- Không giải thích vì sao sửa
- Không thêm bình luận
- Không thay đổi ngoài yêu cầu`;

    const userPrompt = `NỘI DUNG HIỆN TẠI:
---
${currentContent}
---

YÊU CẦU CHỈNH SỬA: ${instruction}

Hãy chỉnh sửa nội dung theo yêu cầu trên.`;

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

    // Return the edited content (not saved yet - let user preview)
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
