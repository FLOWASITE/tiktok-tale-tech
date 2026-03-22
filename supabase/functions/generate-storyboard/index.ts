import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { saveMetrics, generateTraceId, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { getOutputLanguage, getLanguageConfig } from "../_shared/country-language-map.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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

// Localized system prompts by language
function getDefaultSystemPrompt(lang: string): string {
  if (lang === 'th') {
    return `คุณเป็นผู้กำกับวิดีโอและ storyboard artist มืออาชีพ
หน้าที่ของคุณคือวิเคราะห์สคริปต์วิดีโอและสร้าง storyboard โดยละเอียดสำหรับแต่ละฉาก

สำหรับแต่ละ prompt/ส่วนในสคริปต์ คุณต้องสร้าง:
1. Visual Direction โดยละเอียด (มุมกล้อง, การเคลื่อนไหวกล้อง, แสง, อุปกรณ์ประกอบฉาก, การแสดง)
2. Emotional Tone ที่เหมาะสม
3. Transition effects ระหว่างฉาก
4. Text overlay suggestions
5. Background/Setting description

ตอบกลับเป็น JSON ที่ถูกต้องเสมอตามโครงสร้างที่กำหนด`;
  }
  if (lang === 'en') {
    return `You are a professional video director and storyboard artist.
Your task is to analyze video scripts and create detailed storyboards for each scene.

For each prompt/segment in the script, you need to create:
1. Detailed Visual Direction (camera angle, camera movement, lighting, props, actions)
2. Appropriate Emotional Tone
3. Transition effects between scenes
4. Text overlay suggestions
5. Background/Setting description

Always return valid JSON with the specified structure.`;
  }
  // Default: Vietnamese
  return `Bạn là chuyên gia đạo diễn video và storyboard artist chuyên nghiệp. 
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
}
Deno.serve(withPerf({ functionName: 'generate-storyboard', slowThresholdMs: 45000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const traceId = generateTraceId();

  try {
    const { scriptContent, scriptTitle, duration, videoType, characterType, brandName, organizationId, outputLanguage: reqLang, countryCode } = await req.json();

    // Determine output language
    const outputLanguage = reqLang || getOutputLanguage(countryCode || 'VN');
    const langConfig = getLanguageConfig(outputLanguage);

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
    const userId = await resolveUserId(req, supabase);


    // Create PromptManager for this function
    const pm = createPromptManager(supabase, 'generate-storyboard', organizationId);

    // Fetch system prompt from database (with fallback to hardcoded)
    let systemPrompt: string;
    try {
      systemPrompt = await pm.get('system', {
        videoType: videoType || 'short-form',
        characterType: characterType || 'presenter',
        outputLanguage,
      });
    } catch (err) {
      console.warn('[generate-storyboard] Failed to fetch prompt from DB, using fallback:', err);
      systemPrompt = getDefaultSystemPrompt(outputLanguage);
    }

    // Build user prompt with variables - language-aware
    const userPromptLabels = outputLanguage === 'th' ? {
      analyze: 'วิเคราะห์สคริปต์ต่อไปนี้และสร้าง storyboard โดยละเอียด',
      title: 'ชื่อเรื่อง', targetDuration: 'ระยะเวลาเป้าหมาย', seconds: 'วินาที',
      videoType: 'ประเภทวิดีโอ', characterType: 'ประเภทตัวละคร', brand: 'แบรนด์', script: 'สคริปต์',
      requirements: 'ข้อกำหนด',
      r1: 'แบ่งสคริปต์เป็นฉาก/prompt ตามตรรกะ',
      r2: `แต่ละฉากมีระยะเวลาที่เหมาะสม รวม = ${duration} วินาที`,
      r3: 'Visual direction ต้องเฉพาะเจาะจงและปฏิบัติได้',
      r4: 'มุมกล้องและการเคลื่อนไหวต้องหลากหลาย',
      r5: 'Transitions ที่ราบรื่นระหว่างฉาก',
      r6: 'แนะนำ text overlay สำหรับจุดสำคัญ',
      returnJson: 'ตอบกลับเป็น JSON ที่ถูกต้อง',
    } : outputLanguage === 'en' ? {
      analyze: 'Analyze the following script and create a detailed storyboard',
      title: 'Title', targetDuration: 'Target Duration', seconds: 'seconds',
      videoType: 'Video Type', characterType: 'Character Type', brand: 'Brand', script: 'Script',
      requirements: 'Requirements',
      r1: 'Split the script into logical scenes/prompts',
      r2: `Each scene with appropriate duration, total = ${duration} seconds`,
      r3: 'Visual direction must be specific and actionable',
      r4: 'Camera angles and movements must be diverse',
      r5: 'Smooth transitions between scenes',
      r6: 'Suggest text overlay for key points',
      returnJson: 'Return valid JSON.',
    } : {
      analyze: 'Phân tích kịch bản sau và tạo storyboard chi tiết',
      title: 'Tiêu đề', targetDuration: 'Thời lượng mục tiêu', seconds: 'giây',
      videoType: 'Loại video', characterType: 'Kiểu nhân vật', brand: 'Thương hiệu', script: 'Kịch bản',
      requirements: 'Yêu cầu',
      r1: 'Chia kịch bản thành các prompt/phân cảnh logic',
      r2: `Mỗi scene có thời lượng phù hợp, tổng = ${duration} giây`,
      r3: 'Visual direction phải cụ thể, dễ thực hiện',
      r4: 'Camera angles và movements phải đa dạng, giữ người xem engaged',
      r5: 'Transitions mượt mà giữa các cảnh',
      r6: 'Gợi ý text overlay cho những điểm quan trọng',
      returnJson: 'Trả về JSON hợp lệ.',
    };

    const L = userPromptLabels;
    const userPrompt = `${L.analyze}:

**${L.title}:** ${scriptTitle}
**${L.targetDuration}:** ${duration} ${L.seconds}
**${L.videoType}:** ${videoType}
**${L.characterType}:** ${characterType}
${brandName ? `**${L.brand}:** ${brandName}` : ""}

**${L.script}:**
${scriptContent}

${L.requirements}:
1. ${L.r1}
2. ${L.r2}
3. ${L.r3}
4. ${L.r4}
5. ${L.r5}
6. ${L.r6}

${L.returnJson}`;

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

    // Save AI metrics (non-blocking)
    const model = "google/gemini-2.5-flash";
    const inputTokens = data.usage?.prompt_tokens || estimateTokens(systemPrompt + userPrompt);
    const outputTokens = data.usage?.completion_tokens || estimateTokens(content || '');
    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-storyboard',
      userId,
      totalDurationMs: durationMs,
      aiCallDurationMs: durationMs,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: outputTokens,
      estimatedCostUsd: estimateCost(model, inputTokens, outputTokens),
      modelsUsed: { text: model },
      hadError: false,
      contextSources: [],
      actionType: 'content_generation',
    }).catch(() => {});

    // Track prompt usage
    try {
      await pm.trackAll({
        qualityScore: 85,
        generationTimeMs: durationMs,
      });
    } catch (err) {
      console.warn('[generate-storyboard] Failed to track prompt usage:', err);
    }

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
}));
