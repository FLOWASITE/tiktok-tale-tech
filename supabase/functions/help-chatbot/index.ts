import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Knowledge base for system guidance
const KNOWLEDGE_BASE = `
## TÍNH NĂNG CHÍNH

### 1. Tạo Brand Template
- Đường dẫn: /brands/new
- Bước: Vào Brands → "Tạo Brand mới" → Điền thông tin → Thiết lập Tone of Voice → Thêm Personas/Products → Hoàn tất
- Lưu ý: Brand Template là nền tảng cho mọi nội dung, cần điền đầy đủ thông tin

### 2. Tạo Nội dung Đa kênh
- Đường dẫn: /multichannel/new
- Bước: Chọn Brand → "Tạo nội dung mới" → Chọn kênh → Nhập chủ đề → Xem preview → Xuất bản
- Hỗ trợ: Facebook, Instagram, LinkedIn, TikTok, Twitter, Threads, YouTube

### 3. AI Chatbot (Kho Ý Tưởng)
- Đường dẫn: /topics
- Tính năng: Brainstorm ý tưởng, phân tích trends, tạo content ideas, tư vấn chiến lược
- AI sử dụng brand guidelines để đưa ra gợi ý phù hợp

### 4. Lịch Nội dung
- Đường dẫn: /calendar
- Tính năng: Xem lịch đăng bài, drag & drop thay đổi lịch, quản lý schedule

### 5. Kịch bản Video
- Đường dẫn: /scripts
- Tính năng: Tạo kịch bản cho TikTok, Reels, Shorts với AI hỗ trợ

### 6. Carousel Design
- Đường dẫn: /carousel
- Tính năng: Thiết kế carousel cho Instagram, LinkedIn với templates đẹp

## THUẬT NGỮ
- Brand Template: Bộ quy chuẩn thương hiệu
- Content Pillars: Chủ đề nội dung chính
- Tone of Voice: Phong cách giao tiếp
- Personas: Chân dung khách hàng mục tiêu
- Multi-Channel: Tạo nội dung cho nhiều kênh

## FAQ
- AI không đúng tone? → Kiểm tra Brand Template, thêm Sample Texts
- Muốn tạo nhiều kênh cùng lúc? → Dùng Multi-Channel Content
- Mời thành viên? → Vào Organization Settings → Mời thành viên
`;

const SYSTEM_PROMPT = `Bạn là Trợ lý Hướng dẫn của hệ thống quản lý content marketing.

NHIỆM VỤ:
- Trả lời câu hỏi về cách sử dụng hệ thống
- Hướng dẫn từng bước các tính năng
- Giải thích thuật ngữ
- Đề xuất tính năng phù hợp với nhu cầu người dùng

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}

QUY TẮC:
1. Trả lời ngắn gọn, dễ hiểu bằng tiếng Việt
2. Sử dụng bullet points hoặc số thứ tự cho hướng dẫn nhiều bước
3. Nếu có route phù hợp, đề xuất: "[ACTION:NAVIGATE:/path|Text hiển thị]"
4. Nếu cần xem hướng dẫn trực quan, đề xuất: "[ACTION:COACHMARK:id|Xem hướng dẫn]"
5. Luôn thân thiện và hữu ích
6. Nếu không biết câu trả lời, hãy nói thật và đề xuất liên hệ support

VÍ DỤ RESPONSE:
"Để tạo brand mới, bạn làm theo các bước sau:
1. Vào trang **Brands** từ menu
2. Click nút **Tạo Brand mới**
3. Điền thông tin cơ bản

[ACTION:NAVIGATE:/brands/new|Đi tạo Brand ngay]"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentRoute } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context-aware system prompt
    let contextPrompt = SYSTEM_PROMPT;
    if (currentRoute) {
      contextPrompt += `\n\nNGỮ CẢNH: User đang ở trang ${currentRoute}. Hãy ưu tiên đề xuất các tính năng liên quan đến trang này.`;
    }

    console.log(`[help-chatbot] Processing request from route: ${currentRoute}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: contextPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[help-chatbot] AI Gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Cần nạp thêm credits để sử dụng." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Lỗi kết nối AI, vui lòng thử lại." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[help-chatbot] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
