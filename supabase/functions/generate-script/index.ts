import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  expert_share: "Chuyên gia chia sẻ kiến thức",
  analyze_explain: "Phân tích – giải thích",
  warning_mistake: "Cảnh báo – bóc tách sai lầm",
  quick_qa: "Hỏi – đáp nhanh",
};

const CHARACTER_TYPE_LABELS: Record<string, string> = {
  male_expert: "Chuyên gia nam",
  female_expert: "Chuyên gia nữ",
  consultant: "Nhân vật tư vấn",
  instructor: "Nhân vật hướng dẫn",
  ai_presenter: "Nhân vật trung tính (AI presenter)",
};

function getPromptCount(duration: number): string {
  switch (duration) {
    case 60:
      return "7-8";
    case 90:
      return "10-11";
    case 120:
      return "14-15";
    case 180:
      return "21-23";
    default:
      return "7-8";
  }
}

function buildSystemPrompt(
  topic: string,
  duration: number,
  videoType: string,
  characterType: string
): string {
  const promptCount = getPromptCount(duration);
  const videoTypeName = VIDEO_TYPE_LABELS[videoType] || "Chuyên gia chia sẻ kiến thức";
  const characterTypeName = CHARACTER_TYPE_LABELS[characterType] || "Chuyên gia";

  return `Bạn là một hệ thống AI chuyên tạo KỊCH BẢN & PROMPT VIDEO cho video ngắn TikTok (1–3 phút), phục vụ quy trình sản xuất: VEO 3 (HÌNH ẢNH) → Minimax (GIỌNG NÓI) → CapCut (DỰNG).

THÔNG TIN ĐẦU VÀO:
- Chủ đề: ${topic}
- Thời lượng: ${duration} giây
- Thể loại: ${videoTypeName}
- Nhân vật: ${characterTypeName}
- Số lượng prompt cần tạo: ${promptCount} prompt

NGUYÊN TẮC VAI TRÒ NHÂN VẬT:
- Nhân vật được chọn chỉ ảnh hưởng đến cách xưng hô, cách diễn đạt, sắc thái giọng điệu
- TUYỆT ĐỐI KHÔNG mô tả ngoại hình, trang phục, bối cảnh
- TUYỆT ĐỐI KHÔNG thay đổi tư thế lớn giữa các prompt

CẤU TRÚC VIDEO:
- Tổng thời lượng: ${duration} giây
- Mỗi PROMPT ≈ 8 giây
- Mỗi prompt chỉ chứa 01 ý hoàn chỉnh
- Tất cả prompt khi ghép lại phải tạo thành MỘT NHÂN VẬT NÓI LIÊN TỤC – KHÔNG RỜI RẠC

QUY ƯỚC GIỌNG NÓI (CỐ ĐỊNH):
- Giọng: miền Bắc
- Phong cách: Chuyên nghiệp, điềm tĩnh, tự tin, không quảng cáo
- Ngữ điệu: Nhấn mạnh từ khóa chuyên môn, có nhịp nghỉ tự nhiên, không nói quá nhanh

QUY ƯỚC CHUYỂN ĐỘNG NHÂN VẬT (VEO 3):
- Tư thế: Đứng hoặc ngồi ổn định, nhìn thẳng camera
- Chuyển động: Nhẹ, chậm, có kiểm soát, gật đầu nhẹ khi nhấn ý, đưa tay nhấn từ khóa
- TUYỆT ĐỐI KHÔNG: Quay đầu đột ngột, thay đổi tư thế lớn, cử chỉ mạnh hoặc liên tục

ĐỊNH DẠNG CHUẨN CỦA MỖI PROMPT:

PROMPT X:

[1] Chuyển động nhân vật:
(Mô tả ngắn, liên tục, kế thừa chuyển động prompt trước)

[2] Lời thoại (đọc nguyên văn):
"…"

[3] Giọng điệu:
Giọng miền Bắc, phù hợp với vai trò nhân vật đã chọn, điềm tĩnh, rõ ràng, nhấn mạnh từ khóa chính

NGUYÊN TẮC NỐI MẠCH:
- Prompt sau kế thừa tư thế, trạng thái, nhịp nói của prompt trước
- Lời thoại: Không chào hỏi lại, không reset nội dung, không gộp nhiều ý
- Nghe như: MỘT NGƯỜI ĐANG NÓI LIÊN TỤC

LOGIC KỊCH BẢN:
1. Hook (1–2 prompt) - Thu hút người xem
2. Vấn đề / hiểu lầm - Nêu vấn đề
3. Phân tích theo vai trò nhân vật - Giải thích chi tiết
4. Kết luận / lời khuyên - Tổng kết
5. CTA nhẹ (nếu có, không bán hàng)

YÊU CẦU ĐẦU RA:
– Chỉ xuất danh sách PROMPT
– Đúng định dạng
– Không giải thích
– Không bình luận
– Không thêm nội dung ngoài prompt`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, duration, video_type, character_type } = await req.json();

    if (!topic || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: "Vui lòng nhập chủ đề video" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key chưa được cấu hình" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating script for topic:", topic);
    console.log("Duration:", duration, "Video type:", video_type, "Character:", character_type);

    const systemPrompt = buildSystemPrompt(topic, duration, video_type, character_type);

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
          { role: "user", content: `Hãy tạo kịch bản video TikTok về chủ đề: "${topic}"` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

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

      return new Response(
        JSON.stringify({ error: "Không thể tạo kịch bản. Vui lòng thử lại." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", data);
      return new Response(
        JSON.stringify({ error: "AI không trả về nội dung" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Script generated successfully, saving to database...");

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate title from topic
    const title = topic.length > 50 ? topic.substring(0, 50) + "..." : topic;

    const { data: savedScript, error: dbError } = await supabase
      .from("scripts")
      .insert({
        title,
        topic,
        duration,
        video_type,
        character_type,
        content,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Không thể lưu kịch bản vào database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Script saved with ID:", savedScript.id);

    return new Response(JSON.stringify(savedScript), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});