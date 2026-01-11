import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { saveMetrics, generateTraceId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StoryboardScene {
  sceneNumber: number;
  promptText: string;
  duration: number;
  visualDirection: {
    cameraAngle: string;
    cameraMovement: string;
    lighting: string;
    props: string[];
    actions: string[];
    textOverlay?: string;
    backgroundSetting: string;
  };
  emotionalTone: string;
  transitionIn?: string;
  transitionOut?: string;
  notes?: string;
}

// Default system prompt fallback
const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia đạo diễn video và storyboard artist chuyên nghiệp. 
Nhiệm vụ của bạn là phân tích kịch bản video và tạo storyboard chi tiết cho từng phân cảnh.

Với mỗi prompt/đoạn trong kịch bản, bạn cần tạo:
1. Visual Direction chi tiết (góc máy, chuyển động máy, ánh sáng, đạo cụ, hành động)
2. Emotional Tone phù hợp
3. Transition effects giữa các cảnh
4. Text overlay suggestions
5. Background/Setting description

Luôn trả về JSON hợp lệ với cấu trúc sau:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "promptText": "Nội dung prompt gốc",
      "duration": 5,
      "visualDirection": {
        "cameraAngle": "Close-up / Medium shot / Wide shot / POV",
        "cameraMovement": "Static / Pan left / Zoom in / Dolly forward",
        "lighting": "Soft natural light / Studio lighting / Dramatic shadows",
        "props": ["item1", "item2"],
        "actions": ["action1", "action2"],
        "textOverlay": "Text hiển thị (nếu có)",
        "backgroundSetting": "Mô tả bối cảnh"
      },
      "emotionalTone": "Confident / Curious / Excited / Serious",
      "transitionIn": "Cut / Fade in / Slide in",
      "transitionOut": "Cut / Fade out / Dissolve",
      "notes": "Ghi chú thêm cho quay phim"
    }
  ],
  "styleNotes": "Gợi ý phong cách tổng thể cho video"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const traceId = generateTraceId();

  try {
    const { scriptContent, scriptTitle, duration, videoType, characterType, brandName, organizationId } = await req.json();

    if (!scriptContent) {
      return new Response(
        JSON.stringify({ error: "Thiếu nội dung kịch bản" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for prompt fetching
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create PromptManager for this function
    const pm = createPromptManager(supabase, 'generate-storyboard', organizationId);

    // Fetch system prompt from database (with fallback to hardcoded)
    let systemPrompt: string;
    try {
      systemPrompt = await pm.get('system', {
        videoType: videoType || 'short-form',
        characterType: characterType || 'presenter',
      });
    } catch (err) {
      console.warn('[generate-storyboard] Failed to fetch prompt from DB, using fallback:', err);
      systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    // Build user prompt with variables
    const userPrompt = `Phân tích kịch bản sau và tạo storyboard chi tiết:

**Tiêu đề:** ${scriptTitle}
**Thời lượng mục tiêu:** ${duration} giây
**Loại video:** ${videoType}
**Kiểu nhân vật:** ${characterType}
${brandName ? `**Thương hiệu:** ${brandName}` : ""}

**Kịch bản:**
${scriptContent}

Yêu cầu:
1. Chia kịch bản thành các prompt/phân cảnh logic (thường theo ký hiệu [PROMPT 1], [PROMPT 2]... hoặc theo đoạn văn)
2. Mỗi scene có thời lượng phù hợp, tổng = ${duration} giây
3. Visual direction phải cụ thể, dễ thực hiện
4. Camera angles và movements phải đa dạng, giữ người xem engaged
5. Transitions mượt mà giữa các cảnh
6. Gợi ý text overlay cho những điểm quan trọng

Trả về JSON hợp lệ.`;

    console.log(`[generate-storyboard] Generating for: ${scriptTitle}, trace: ${traceId}`);

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-storyboard] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt giới hạn API. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Cần nạp thêm credits để tiếp tục sử dụng." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let storyboardData;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      storyboardData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[generate-storyboard] Failed to parse storyboard JSON:", parseError);
      console.log("Raw content:", content);
      throw new Error("Không thể phân tích kết quả từ AI");
    }

    // Validate and normalize scenes
    const scenes: StoryboardScene[] = (storyboardData.scenes || []).map((scene: any, index: number) => ({
      sceneNumber: scene.sceneNumber || index + 1,
      promptText: scene.promptText || "",
      duration: scene.duration || Math.floor(duration / (storyboardData.scenes?.length || 1)),
      visualDirection: {
        cameraAngle: scene.visualDirection?.cameraAngle || "Medium shot",
        cameraMovement: scene.visualDirection?.cameraMovement || "Static",
        lighting: scene.visualDirection?.lighting || "Natural light",
        props: scene.visualDirection?.props || [],
        actions: scene.visualDirection?.actions || [],
        textOverlay: scene.visualDirection?.textOverlay,
        backgroundSetting: scene.visualDirection?.backgroundSetting || "Studio",
      },
      emotionalTone: scene.emotionalTone || "Neutral",
      transitionIn: scene.transitionIn || "Cut",
      transitionOut: scene.transitionOut || "Cut",
      notes: scene.notes,
    }));

    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    const durationMs = Date.now() - startTime;

    console.log(`[generate-storyboard] Generated ${scenes.length} scenes, total duration: ${totalDuration}s, took ${durationMs}ms`);

    // Track prompt usage
    try {
      await pm.trackAll({
        qualityScore: 85, // Default score for storyboard
        generationTimeMs: durationMs,
      });
    } catch (err) {
      console.warn('[generate-storyboard] Failed to track prompt usage:', err);
    }

    // Save metrics
    try {
      await saveMetrics(supabase, {
        traceId,
        functionName: 'generate-storyboard',
        totalDurationMs: durationMs,
        organizationId,
        actionType: 'generate',
      });
    } catch (err) {
      console.warn('[generate-storyboard] Failed to save metrics:', err);
    }

    // Log prompt info for debugging
    console.log('[generate-storyboard] Prompts used:', pm.getPromptInfo());

    return new Response(
      JSON.stringify({
        scenes,
        styleNotes: storyboardData.styleNotes || "",
        totalDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-storyboard] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Lỗi không xác định" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
