import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreviewRequest {
  topic: string;
  industry?: string;
  contentGoal: string;
  previewChannel: string; // Channel to preview
  brandTemplateId?: string;
}

const CONTENT_GOAL_LABELS: Record<string, string> = {
  education: "Giáo dục - Chia sẻ kiến thức",
  awareness: "Nhận diện - Tăng nhận biết thương hiệu",
  engagement: "Tương tác - Khuyến khích bình luận, chia sẻ",
  expertise: "Xây chuyên gia - Thể hiện chuyên môn sâu",
  conversion: "Chuyển đổi - Thúc đẩy hành động mua hàng",
};

const CHANNEL_LABELS: Record<string, string> = {
  website: "Website/Blog",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  google_maps: "Google Maps",
  linkedin: "LinkedIn",
  email: "Email",
  youtube: "YouTube",
  zalo_oa: "Zalo OA",
  telegram: "Telegram",
  tiktok: "TikTok",
  threads: "Threads",
};

const CHANNEL_LIMITS: Record<string, { min: number; max: number; unit: string }> = {
  website: { min: 300, max: 500, unit: "từ" },
  facebook: { min: 80, max: 150, unit: "từ" },
  instagram: { min: 30, max: 80, unit: "từ" },
  twitter: { min: 0, max: 280, unit: "ký tự" },
  google_maps: { min: 50, max: 100, unit: "từ" },
  linkedin: { min: 100, max: 200, unit: "từ" },
  email: { min: 100, max: 200, unit: "từ" },
  youtube: { min: 100, max: 200, unit: "từ" },
  zalo_oa: { min: 30, max: 80, unit: "từ" },
  telegram: { min: 50, max: 120, unit: "từ" },
  tiktok: { min: 20, max: 60, unit: "từ" },
  threads: { min: 30, max: 100, unit: "từ" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, industry, contentGoal, previewChannel, brandTemplateId } = await req.json() as PreviewRequest;

    if (!topic || !contentGoal || !previewChannel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch brand template if provided
    let brandName = "Thương hiệu";
    let brandVoicePrompt = "";
    
    if (brandTemplateId) {
      const { data: template } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("id", brandTemplateId)
        .single();

      if (template) {
        brandName = template.brand_name || "Thương hiệu";
        
        const parts: string[] = [];
        if (template.brand_positioning) {
          parts.push(`Định vị: ${template.brand_positioning}`);
        }
        if (template.tone_of_voice?.length) {
          parts.push(`Tone: ${template.tone_of_voice.join(", ")}`);
        }
        if (template.formality_level) {
          parts.push(`Phong cách: ${template.formality_level}`);
        }
        if (template.preferred_words?.length) {
          parts.push(`Từ ưu tiên: ${template.preferred_words.join(", ")}`);
        }
        if (template.forbidden_words?.length) {
          parts.push(`Từ cấm: ${template.forbidden_words.join(", ")}`);
        }
        brandVoicePrompt = parts.join("\n");
      }
    }

    const channelLabel = CHANNEL_LABELS[previewChannel] || previewChannel;
    const channelLimit = CHANNEL_LIMITS[previewChannel] || { min: 50, max: 150, unit: "từ" };
    const goalLabel = CONTENT_GOAL_LABELS[contentGoal] || contentGoal;

    const systemPrompt = `Bạn là chuyên gia content marketing tại Việt Nam. 
Viết nội dung PREVIEW ngắn gọn cho kênh ${channelLabel}.

${brandVoicePrompt ? `BRAND VOICE:\n${brandVoicePrompt}\n` : ""}

QUY TẮC:
- Viết ${channelLimit.min}-${channelLimit.max} ${channelLimit.unit}
- Mục tiêu: ${goalLabel}
- Ngôn ngữ: Tiếng Việt tự nhiên
- Phong cách phù hợp với kênh ${channelLabel}
- KHÔNG giải thích, chỉ viết nội dung
- Format phù hợp với kênh (có thể dùng emoji nếu phù hợp)`;

    const userPrompt = `Viết nội dung ${channelLabel} về chủ đề: "${topic}"${industry ? ` trong ngành ${industry}` : ""}.

Tên thương hiệu: ${brandName}
Mục tiêu nội dung: ${goalLabel}`;

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
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        preview: content,
        channel: previewChannel,
        channelLabel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Preview error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
