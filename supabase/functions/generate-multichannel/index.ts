import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormData {
  topic: string;
  industry?: string;
  contentGoal: string;
  channels: string[];
  brandTemplateId?: string;
}

// Brand Voice label mappings
const brandPositioningLabels: Record<string, string> = {
  business: "Doanh nghiệp",
  expert: "Chuyên gia",
  agency: "Agency",
  consultant: "Tư vấn",
};

const toneOfVoiceLabels: Record<string, string> = {
  expert: "Chuyên gia",
  calm: "Điềm tĩnh",
  confident: "Tự tin",
  friendly: "Thân thiện",
  analytical: "Phân tích",
  serious: "Nghiêm túc",
  inspirational: "Truyền cảm hứng",
};

const formalityLevelLabels: Record<string, string> = {
  very_formal: "Rất trang trọng",
  professional: "Chuyên nghiệp",
  neutral: "Trung lập",
  casual: "Gần gũi",
};

const languageStyleLabels: Record<string, string> = {
  clear_direct: "Rõ ràng, trực tiếp",
  structured: "Có cấu trúc",
  no_exaggeration: "Không khoa trương",
  no_over_emotion: "Không cảm tính quá mức",
};

interface BrandVoice {
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
}

const getBrandVoicePrompt = (voice: BrandVoice): string => {
  const parts: string[] = [];
  
  parts.push(`## BRAND VOICE PROFILE (LUẬT CAO NHẤT)`);
  parts.push(`Brand Voice là LUẬT CAO NHẤT. Mọi nội dung PHẢI tuân theo Brand Voice.`);
  
  if (voice.brand_positioning) {
    const label = brandPositioningLabels[voice.brand_positioning] || voice.brand_positioning;
    parts.push(`\n### Định vị thương hiệu: ${label}`);
  }
  
  if (voice.tone_of_voice && voice.tone_of_voice.length > 0) {
    const tones = voice.tone_of_voice.map(t => toneOfVoiceLabels[t] || t).join(", ");
    parts.push(`\n### Tone of Voice: ${tones}`);
  }
  
  if (voice.formality_level) {
    const label = formalityLevelLabels[voice.formality_level] || voice.formality_level;
    parts.push(`\n### Mức trang trọng: ${label}`);
  }
  
  if (voice.language_style && voice.language_style.length > 0) {
    const styles = voice.language_style.map(s => languageStyleLabels[s] || s).join(", ");
    parts.push(`\n### Phong cách ngôn ngữ: ${styles}`);
  }
  
  parts.push(`\n### NGUYÊN TẮC BRAND VOICE BẮT BUỘC`);
  parts.push(`1. Brand Voice OVERRIDE mọi style khác`);
  parts.push(`2. Không được "sáng tạo giọng mới"`);
  parts.push(`3. Không thay đổi giọng giữa các kênh`);
  parts.push(`4. Nếu yêu cầu MÂU THUẪN với Brand Voice → ƯU TIÊN Brand Voice`);
  parts.push(`5. KHÔNG thông báo hay giải thích về Brand Voice trong output`);
  
  if (voice.preferred_words && voice.preferred_words.length > 0) {
    parts.push(`\n### TỪ PHẢI DÙNG (ưu tiên sử dụng)`);
    parts.push(voice.preferred_words.join(", "));
  }
  
  if (voice.forbidden_words && voice.forbidden_words.length > 0) {
    parts.push(`\n### TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG)`);
    parts.push(voice.forbidden_words.join(", "));
  }
  
  parts.push(`\n### EMOJI`);
  if (voice.allow_emoji) {
    parts.push(`Có thể dùng emoji TIẾT CHẾ theo từng kênh (Website/Google Maps: KHÔNG emoji)`);
  } else {
    parts.push(`TUYỆT ĐỐI KHÔNG dùng emoji trong bất kỳ kênh nào`);
  }
  
  if (voice.compliance_rules && voice.compliance_rules.length > 0) {
    parts.push(`\n### QUY TẮC TUÂN THỦ`);
    voice.compliance_rules.forEach(rule => {
      parts.push(`- ${rule}`);
    });
  }
  
  return parts.join("\n");
};

const getSystemPrompt = (
  brandName: string, 
  brandGuideline: string | null,
  primaryColor: string | null,
  contentGoal: string,
  channels: string[],
  brandVoice?: BrandVoice
): string => {
  const goalDescriptions: Record<string, string> = {
    education: "Giáo dục - Chia sẻ kiến thức chuyên sâu, hướng dẫn thực hành. Tone: Chuyên gia, rõ ràng, có giá trị.",
    awareness: "Nhận diện - Tăng nhận biết thương hiệu. Tone: Ấn tượng, đáng nhớ, consistent brand voice.",
    engagement: "Tương tác - Khuyến khích bình luận, chia sẻ. Tone: Gần gũi, đặt câu hỏi, tạo tranh luận.",
    expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu. Tone: Chuyên nghiệp, có insight, data-driven.",
    conversion: "Chuyển đổi - Thúc đẩy hành động. Tone: Thuyết phục, urgency nhẹ, clear CTA.",
  };

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

    linkedin: `LINKEDIN:
- Độ dài: 300–700 chữ
- Cấu trúc:
  • Hook mạnh (insight, số liệu, câu hỏi thought-provoking)
  • Chia đoạn ngắn, dễ đọc trên mobile
  • Kết luận với perspective cá nhân
  • CTA nhẹ (comment, share, follow)
- Giọng: Chuyên nghiệp, B2B authority, có insight
- Có thể dùng emoji TIẾT CHẾ
- Thêm 3-5 hashtag cuối bài`,

    email: `EMAIL MARKETING:
- Độ dài: 200–500 chữ
- Cấu trúc:
  • Subject line hấp dẫn (không spam trigger)
  • Opening line cá nhân hóa
  • Value proposition rõ ràng
  • CTA button text suggestion
  • P.S. line (optional)
- Giọng: Chuyên nghiệp nhưng thân thiện
- KHÔNG dùng emoji trong subject
- Clear CTA, không quá nhiều links`,

    youtube: `YOUTUBE (Script/Description):
- Độ dài: Script 3-5 phút (~500-800 chữ)
- Cấu trúc:
  • Hook 5 giây đầu
  • Intro ngắn (ai, về gì)
  • Nội dung chính (chia segments)
  • CTA subscribe + comment
  • Outro
- Bổ sung: Title suggestion, Description SEO, Tags
- Giọng: Năng động, dễ hiểu, engaging`,

    zalo_oa: `ZALO OA:
- Độ dài: 100–200 chữ
- Cấu trúc:
  • Lời chào thân thiện
  • Thông tin chính ngắn gọn
  • CTA rõ ràng (gọi điện, nhắn tin, xem thêm)
- Giọng: Thân thiện, local, gần gũi
- Có thể dùng emoji phù hợp
- Format phù hợp mobile`,
  };

  const selectedChannelRules = channels
    .map(ch => channelRules[ch])
    .filter(Boolean)
    .join("\n\n");

  // Build Brand Voice section if available
  const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice) : "";

  return `Bạn là hệ thống AI tạo NỘI DUNG ĐA KÊNH cho doanh nghiệp (B2B).

${brandVoiceSection}

## NGUYÊN TẮC LÕI
ONE TOPIC → ONE CORE MESSAGE → MULTI-CHANNEL CONTENT
- Từ MỘT chủ đề, tạo nội dung PHÙ HỢP RIÊNG cho từng kênh
- Nội dung dùng được NGAY để đăng thật
- KHÔNG sao chép máy móc giữa các kênh
- Giữ thông điệp lõi NHẤT QUÁN

## BRAND CONTEXT
Brand name: ${brandName}
${brandGuideline ? `Brand guideline: ${brandGuideline}` : ""}
${primaryColor ? `Màu chủ đạo: ${primaryColor}` : ""}

## MỤC TIÊU NỘI DUNG
${goalDescriptions[contentGoal] || contentGoal}

## QUY ƯỚC THEO TỪNG KÊNH
${selectedChannelRules}

## NGUYÊN TẮC BẮT BUỘC
1. KHÔNG dùng chung một bài cho mọi kênh
2. KHÔNG copy nguyên văn giữa các kênh
3. Mỗi kênh phải đúng hành vi người đọc, đúng giới hạn kỹ thuật
4. Giữ thông điệp lõi NHẤT QUÁN xuyên suốt
5. Giọng văn: Chuyên nghiệp, rõ ràng, không quảng cáo lộ liễu, phù hợp B2B

## ĐIỀU TUYỆT ĐỐI KHÔNG LÀM
- Không giải thích vì sao viết như vậy
- Không bình luận ngoài nội dung
- Không thêm kênh không được yêu cầu
- Không dùng emoji cho Website và Google Maps${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji ở BẤT KỲ kênh nào (Brand Voice yêu cầu)" : ""}
- Không lặp lại câu chữ giữa các kênh`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: FormData = await req.json();
    console.log("Generating multi-channel content for:", formData.topic);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load brand template if provided
    let brandName = "Thương hiệu";
    let brandGuideline: string | null = null;
    let primaryColor: string | null = null;
    let industry: string | null = formData.industry || null;
    let brandVoice: BrandVoice | undefined;

    if (formData.brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("id", formData.brandTemplateId)
        .single();

      if (template) {
        brandName = template.brand_name;
        brandGuideline = template.brand_guideline;
        primaryColor = template.primary_color;
        // Use industry from template if not provided in form
        if (!industry && template.industry && Array.isArray(template.industry) && template.industry.length > 0) {
          industry = template.industry.join(', ');
        }
        // Extract Brand Voice
        brandVoice = {
          brand_positioning: template.brand_positioning,
          tone_of_voice: template.tone_of_voice,
          formality_level: template.formality_level,
          language_style: template.language_style,
          preferred_words: template.preferred_words,
          forbidden_words: template.forbidden_words,
          allow_emoji: template.allow_emoji ?? true,
          compliance_rules: template.compliance_rules,
        };
        console.log("Brand Voice loaded:", brandVoice.brand_positioning, brandVoice.tone_of_voice);
      }
    }

    const systemPrompt = getSystemPrompt(
      brandName,
      brandGuideline,
      primaryColor,
      formData.contentGoal,
      formData.channels,
      brandVoice
    );

    const userPrompt = `Tạo nội dung đa kênh cho chủ đề:
"${formData.topic}"

${industry ? `Ngành/Bối cảnh: ${industry}` : ""}

Các kênh cần tạo nội dung: ${formData.channels.join(", ")}

Hãy tạo nội dung RIÊNG BIỆT, PHÙ HỢP cho từng kênh theo đúng quy ước đã cho.
Đảm bảo thông điệp lõi nhất quán nhưng format và tone khác nhau theo từng nền tảng.`;

    // Build tool parameters based on selected channels
    const channelProperties: Record<string, object> = {};
    const channelDescriptions: Record<string, string> = {
      website: "Nội dung cho Website/Blog (800-1500 chữ, markdown format, không emoji)",
      facebook: "Nội dung cho Facebook (120-300 chữ, hook mạnh, chia đoạn ngắn)",
      instagram: "Nội dung cho Instagram (50-150 chữ, ngắn gọn, có hashtag)",
      twitter: "Nội dung cho X/Twitter (thread 5-7 tweets, mỗi tweet ≤280 ký tự, đánh số)",
      google_maps: "Nội dung cho Google Maps (80-150 chữ, trung tính, không emoji/hashtag)",
      linkedin: "Nội dung cho LinkedIn (300-700 chữ, B2B authority, insight)",
      email: "Nội dung Email (200-500 chữ, subject line + body + CTA)",
      youtube: "Script YouTube (500-800 chữ, hook + content + CTA)",
      zalo_oa: "Nội dung Zalo OA (100-200 chữ, thân thiện, local)",
    };

    formData.channels.forEach(channel => {
      if (channelDescriptions[channel]) {
        channelProperties[`${channel}_content`] = {
          type: "string",
          description: channelDescriptions[channel],
        };
      }
    });

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_multichannel_content",
          description: "Generate content for multiple marketing channels",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Tiêu đề ngắn gọn cho bộ nội dung (dựa trên chủ đề)",
              },
              ...channelProperties,
            },
            required: ["title", ...Object.keys(channelProperties)],
          },
        },
      },
    ];

    console.log("Calling Lovable AI...");
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
        tool_choice: { type: "function", function: { name: "generate_multichannel_content" } },
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
    console.log("AI response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_multichannel_content") {
      throw new Error("Invalid AI response format");
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    console.log("Generated content:", generatedData.title);

    // Save to database
    const { data: content, error: dbError } = await supabase
      .from("multi_channel_contents")
      .insert({
        title: generatedData.title,
        topic: formData.topic,
        industry: industry,
        content_goal: formData.contentGoal,
        selected_channels: formData.channels,
        brand_template_id: formData.brandTemplateId || null,
        brand_name: brandName,
        brand_guideline: brandGuideline,
        primary_color: primaryColor,
        website_content: generatedData.website_content || null,
        facebook_content: generatedData.facebook_content || null,
        instagram_content: generatedData.instagram_content || null,
        twitter_content: generatedData.twitter_content || null,
        google_maps_content: generatedData.google_maps_content || null,
        linkedin_content: generatedData.linkedin_content || null,
        email_content: generatedData.email_content || null,
        youtube_content: generatedData.youtube_content || null,
        zalo_oa_content: generatedData.zalo_oa_content || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to save content");
    }

    console.log("Content saved with ID:", content.id);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-multichannel:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
