import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegenerateRequest {
  contentId: string;
  channel: string;
}

const channelRules: Record<string, string> = {
  website: `WEBSITE/BLOG:
- Độ dài: 800–1500 chữ
- Cấu trúc bắt buộc:
  • Tiêu đề rõ ràng (H1)
  • Các heading H2, H3 phân cấp logic
  • Mở vấn đề hấp dẫn
  • Phân tích chuyên môn chi tiết
  • Kết luận + CTA nhẹ
- Giọng: Trung lập, phân tích, KHÔNG emoji
- Format: Markdown với heading, bullet points, bold key terms`,

  facebook: `FACEBOOK:
- Độ dài: 120–300 chữ
- Cấu trúc:
  • 2 dòng đầu là HOOK mạnh (câu sốc, số liệu, câu hỏi)
  • Nội dung chia đoạn ngắn 2-3 dòng
  • CTA nhẹ cuối bài (không bán hàng thô)
- Giọng: Gần gũi nhưng chuyên nghiệp, như chuyên gia chia sẻ
- Có thể dùng emoji TIẾT CHẾ (1-3 emoji)`,

  instagram: `INSTAGRAM:
- Độ dài: 50–150 chữ
- Cấu trúc:
  • Ngắn gọn, súc tích
  • Nhiều xuống dòng tạo nhịp đọc
  • Hashtag cuối (3-5 hashtag liên quan)
- Giọng: Thân thiện, trẻ trung, inspirational
- KHÔNG link dài, KHÔNG lan man`,

  twitter: `X (TWITTER):
- Format: Thread 5-7 tweets, mỗi tweet ≤ 280 ký tự
- Cấu trúc:
  • Tweet 1: Hook mạnh, gây tò mò
  • Tweet 2-5: Nội dung chính, mỗi tweet 1 ý
  • Tweet 6-7: Kết luận + CTA
- Giọng: Sắc nét, có lập trường rõ ràng
- Câu ngắn, không giải thích dài dòng
- Đánh số tweet (1/, 2/, ...)`,

  google_maps: `GOOGLE MAPS:
- Độ dài: 80–150 chữ
- Nội dung:
  • Thực tế, xác thực
  • Gắn với hoạt động / dịch vụ cụ thể
  • Như một bài đánh giá chuyên nghiệp
- Giọng: Trung tính, khách quan
- KHÔNG marketing quá đà
- KHÔNG hashtag, KHÔNG emoji`,
};

const goalDescriptions: Record<string, string> = {
  education: "Giáo dục - Chia sẻ kiến thức chuyên sâu, hướng dẫn thực hành. Tone: Chuyên gia, rõ ràng, có giá trị.",
  awareness: "Nhận diện - Tăng nhận biết thương hiệu. Tone: Ấn tượng, đáng nhớ, consistent brand voice.",
  engagement: "Tương tác - Khuyến khích bình luận, chia sẻ. Tone: Gần gũi, đặt câu hỏi, tạo tranh luận.",
  expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu. Tone: Chuyên nghiệp, có insight, data-driven.",
  conversion: "Chuyển đổi - Thúc đẩy hành động. Tone: Thuyết phục, urgency nhẹ, clear CTA.",
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
    const { contentId, channel }: RegenerateRequest = await req.json();
    console.log(`Regenerating ${channel} for content ${contentId}`);

    if (!contentId || !channel) {
      throw new Error("contentId và channel là bắt buộc");
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

    // Load existing content
    const { data: content, error: fetchError } = await supabase
      .from("multi_channel_contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (fetchError || !content) {
      console.error("Fetch error:", fetchError);
      throw new Error("Không tìm thấy nội dung");
    }

    const systemPrompt = `Bạn là hệ thống AI tạo NỘI DUNG cho doanh nghiệp (B2B).

## BRAND CONTEXT
Brand name: ${content.brand_name}
${content.brand_guideline ? `Brand guideline: ${content.brand_guideline}` : ""}
${content.primary_color ? `Màu chủ đạo: ${content.primary_color}` : ""}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[content.content_goal] || content.content_goal}

## QUY ƯỚC CHO KÊNH ${channel.toUpperCase()}
${channelRules[channel]}

## NGUYÊN TẮC BẮT BUỘC
1. Tạo nội dung MỚI HOÀN TOÀN, khác với phiên bản trước
2. Giữ cùng thông điệp lõi nhưng thay đổi cách diễn đạt
3. Giọng văn: Chuyên nghiệp, rõ ràng, phù hợp B2B
4. Tuân thủ chính xác format của kênh

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung
- Không dùng emoji nếu kênh không cho phép`;

    const userPrompt = `Viết lại nội dung cho kênh ${channel.toUpperCase()} với chủ đề:
"${content.topic}"

${content.industry ? `Ngành/Bối cảnh: ${content.industry}` : ""}

Tạo một phiên bản MỚI, KHÁC BIỆT với nội dung cũ, nhưng vẫn giữ thông điệp lõi.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_channel_content",
          description: `Generate new content for ${channel}`,
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: `Nội dung mới cho ${channel}`,
              },
            },
            required: ["content"],
          },
        },
      },
    ];

    console.log("Calling Lovable AI for regeneration...");
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
        tool_choice: { type: "function", function: { name: "generate_channel_content" } },
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
    console.log("AI response received for regeneration");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_channel_content") {
      throw new Error("Invalid AI response format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    const newContent = generatedData.content;
    
    if (!newContent) {
      throw new Error("AI không trả về nội dung");
    }

    console.log("New content generated, updating database...");

    // Update the specific channel content
    const updateField = channelFieldMap[channel];
    const { data: updatedContent, error: updateError } = await supabase
      .from("multi_channel_contents")
      .update({ [updateField]: newContent })
      .eq("id", contentId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Không thể cập nhật nội dung");
    }

    console.log(`Successfully regenerated ${channel} for content ${contentId}`);

    return new Response(JSON.stringify(updatedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in regenerate-channel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
