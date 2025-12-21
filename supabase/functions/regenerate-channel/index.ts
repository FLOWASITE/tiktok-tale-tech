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

const channelRules: Record<string, string> = {
  website: `WEBSITE/BLOG: 800–1500 chữ, Markdown format, KHÔNG emoji`,
  facebook: `FACEBOOK: 120–300 chữ, hook mạnh, emoji tiết chế`,
  instagram: `INSTAGRAM: 50–150 chữ, ngắn gọn, hashtag cuối`,
  twitter: `TWITTER: Thread 5-7 tweets, mỗi tweet ≤280 ký tự`,
  google_maps: `GOOGLE MAPS: 80–150 chữ, trung tính, KHÔNG emoji`,
  linkedin: `LINKEDIN: 300–700 chữ, B2B authority, insight`,
  email: `EMAIL: 200–500 chữ, subject line + body + CTA`,
  youtube: `YOUTUBE: Script 500-800 chữ, hook + content + CTA`,
  zalo_oa: `ZALO OA: 100–200 chữ, thân thiện, local`,
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
  linkedin: "linkedin_content",
  email: "email_content",
  youtube: "youtube_content",
  zalo_oa: "zalo_oa_content",
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

    // Load brand template to get Brand Voice if available
    let brandVoice: BrandVoice | undefined;
    if (content.brand_template_id) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("brand_positioning, tone_of_voice, formality_level, language_style, preferred_words, forbidden_words, allow_emoji, compliance_rules")
        .eq("id", content.brand_template_id)
        .single();

      if (template) {
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
        console.log("Brand Voice loaded for regeneration:", brandVoice.brand_positioning);
      }
    }

    // Build Brand Voice section
    const brandVoiceSection = brandVoice ? getBrandVoicePrompt(brandVoice) : "";

    const systemPrompt = `Bạn là hệ thống AI tạo NỘI DUNG cho doanh nghiệp (B2B).

${brandVoiceSection}

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
- Không dùng emoji nếu kênh không cho phép${brandVoice && !brandVoice.allow_emoji ? "\n- KHÔNG dùng emoji (Brand Voice yêu cầu)" : ""}`;

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
