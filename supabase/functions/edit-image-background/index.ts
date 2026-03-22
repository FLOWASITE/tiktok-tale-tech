import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIConfig } from "../_shared/ai-config.ts";
import { generateImageViaKie, isKieModel, mapAspectRatioToKie } from "../_shared/kie-image-generator.ts";
import { generateImageViaPoyo, isPoyoModel, mapAspectRatioToPoyo } from "../_shared/poyo-image-generator.ts";
import { generateTraceId, saveMetrics, estimateTokens, resolveUserId } from "../_shared/logger.ts";
import { estimateCost, estimateImageCost, isImageModel } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EditBackgroundRequest {
  imageUrl: string;
  editType: 'remove' | 'solid_color' | 'gradient' | 'custom_scene' | 'refine_text';
  solidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: 'vertical' | 'horizontal' | 'diagonal';
  customScenePrompt?: string;
  refineTextInstruction?: string;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

function buildEditPrompt(request: EditBackgroundRequest): string {
  switch (request.editType) {
    case 'remove':
      return `Remove the background completely and make it transparent. 
Keep only the main subject with clean, precise edges. 
The output should have alpha transparency for the background area.
Preserve all details of the subject - do not modify, crop, or change the main subject in any way.
The subject should be perfectly cut out with smooth, anti-aliased edges.`;

    case 'solid_color':
      const color = request.solidColor || '#ffffff';
      return `Replace the entire background with a solid ${color} color.
Keep the main subject completely intact with natural, clean edges.
Maintain the original lighting and shadows on the subject to look realistic.
Do not modify the subject itself - only replace the background.
Ensure the transition between subject and background is smooth and professional.`;

    case 'gradient':
      const from = request.gradientFrom || '#6366f1';
      const to = request.gradientTo || '#ec4899';
      const direction = request.gradientDirection || 'vertical';
      const directionText = direction === 'vertical' 
        ? 'top to bottom' 
        : direction === 'horizontal' 
          ? 'left to right' 
          : 'top-left corner to bottom-right corner (diagonal)';
      return `Replace the background with a smooth, beautiful gradient.
Gradient colors: from ${from} to ${to}
Direction: ${directionText}
Keep the main subject completely intact with natural integration.
The gradient should be smooth and professional, without banding artifacts.
Adjust the subject's edge lighting subtly to match the new background colors.`;

    case 'custom_scene':
      const scene = request.customScenePrompt || 'professional studio background';
      return `Replace the background with: ${scene}

CRITICAL INSTRUCTIONS:
- Keep the main subject EXACTLY as it is - do not modify, resize, or change the subject in any way
- Only replace the background environment
- Make the integration look natural with appropriate lighting that matches the new scene
- The subject should appear naturally placed in the new environment
- Adjust edge lighting and shadows to blend seamlessly with the new background
- Maintain the original quality and details of the subject`;

    case 'refine_text':
      const textInstruction = request.refineTextInstruction || '';
      return `Look at this image carefully. It contains text/typography overlays.

TASK: Improve and refine ALL text elements on this image to make them more readable, professional, and visually appealing.

${textInstruction ? `SPECIFIC INSTRUCTIONS: ${textInstruction}` : ''}

CRITICAL RULES:
- Fix any spelling errors, garbled characters, or broken text
- Make text crisp, clear, and properly aligned
- Improve font rendering quality and anti-aliasing
- Ensure proper contrast between text and background
- Fix any text that is cut off, overlapping, or poorly positioned
- Keep the same visual style, colors, and layout of the image
- Do NOT change the background, images, or non-text elements
- Keep the same language as the original text
- If text is in Vietnamese, ensure proper diacritical marks (dấu)
- Maintain the same font style and approximate size
- Output the complete image with improved text`;

    default:
      return 'Remove the background and make it transparent.';
  }
}

Deno.serve(withPerf({ functionName: 'edit-image-background', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: EditBackgroundRequest = await req.json();
    
    // Validate required fields
    if (!request.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request.editType) {
      return new Response(
        JSON.stringify({ success: false, error: "editType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[edit-image-background] Processing ${request.editType} for image`);

    const editPrompt = buildEditPrompt(request);
    console.log(`[edit-image-background] Prompt: ${editPrompt.slice(0, 100)}...`);

    // Read model config from Admin Panel (DB) — falls back to default if not configured
    const aiConfig = await getAIConfig('edit-image-background');
    const modelToUse = aiConfig.model;
    console.log(`[edit-image-background] Using model from config: ${modelToUse}`);

    let editedImageUrl: string | null = null;
    let assistantMessage: string | undefined;

    // Route to PoYo.ai, KIE.ai, or Lovable AI
    if (isPoyoModel(modelToUse)) {
      const POYO_API_KEY = Deno.env.get('POYO_API_KEY');
      if (!POYO_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'POYO_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[edit-image-background] Routing to PoYo.ai: ${modelToUse}`);
      try {
        editedImageUrl = await generateImageViaPoyo({
          prompt: editPrompt,
          model: modelToUse,
          inputImage: request.imageUrl,
          aspectRatio: '1:1',
        }, POYO_API_KEY);
      } catch (poyoErr) {
        const poyoErrMsg = poyoErr instanceof Error ? poyoErr.message : String(poyoErr);
        console.error(`[edit-image-background] PoYo.ai failed: ${poyoErrMsg}`);

        if (poyoErrMsg.includes('POYO_AUTH_ERROR') || poyoErrMsg.includes('POYO_CREDITS_EXHAUSTED')) {
          return new Response(
            JSON.stringify({ success: false, error: poyoErrMsg }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (poyoErrMsg.includes('POYO_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Đã vượt giới hạn request PoYo.ai. Vui lòng thử lại sau.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw poyoErr;
      }
    } else if (isKieModel(modelToUse)) {
      const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: 'KIE_API_KEY not configured. Please add it in project secrets.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[edit-image-background] Routing to KIE.ai: ${modelToUse}`);
      try {
        editedImageUrl = await generateImageViaKie({
          prompt: editPrompt,
          model: modelToUse,
          inputImage: request.imageUrl,
          outputFormat: request.editType === 'remove' ? 'png' : 'jpeg',
          aspectRatio: '1:1',
        }, KIE_API_KEY);
      } catch (kieErr) {
        const kieErrMsg = kieErr instanceof Error ? kieErr.message : String(kieErr);
        console.error(`[edit-image-background] KIE.ai failed: ${kieErrMsg}`);

        if (kieErrMsg.includes('KIE_AUTH_ERROR') || kieErrMsg.includes('KIE_CREDITS_EXHAUSTED')) {
          return new Response(
            JSON.stringify({ success: false, error: kieErrMsg }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (kieErrMsg.includes('KIE_RATE_LIMIT')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Đã vượt giới hạn request kie.ai. Vui lòng thử lại sau.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw kieErr;
      }
    } else {
      // Lovable AI flow (existing Gemini)
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: editPrompt },
              { type: "image_url", image_url: { url: request.imageUrl } }
            ]
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[edit-image-background] AI gateway error: ${response.status}`, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Đã vượt giới hạn request. Vui lòng thử lại sau ít phút.",
              errorCode: "RATE_LIMIT"
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Cần nạp thêm credits để sử dụng tính năng này.",
              errorCode: "PAYMENT_REQUIRED"
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: false, error: "AI processing failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      assistantMessage = data.choices?.[0]?.message?.content;
    }

    if (!editedImageUrl) {
      console.error("[edit-image-background] No image in response");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "AI không thể xử lý ảnh này. Vui lòng thử với ảnh khác.",
          details: assistantMessage 
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[edit-image-background] Success - generated ${request.editType} background edit`);

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const inputTokens = estimateTokens(editPrompt);
    const estimatedCostUsd = isImageModel(modelToUse) ? estimateImageCost(modelToUse) : estimateCost(modelToUse, inputTokens, 0);
    const userId = await resolveUserId(req, createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!));
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'edit-image-background',
        organizationId: request.organizationId,
        userId,
        totalDurationMs,
        aiCallDurationMs: totalDurationMs,
        inputTokensEstimated: inputTokens,
        outputTokensEstimated: 0,
        estimatedCostUsd,
        modelsUsed: { image: modelToUse },
        hadError: false,
        contextSources: [],
        channels: request.channel ? [request.channel] : [],
        contentId: request.contentId,
        actionType: 'image_edit',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: editedImageUrl,
        editType: request.editType,
        message: assistantMessage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[edit-image-background] Error:", error);

    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      saveMetrics(sb, {
        traceId,
        functionName: 'edit-image-background',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_edit',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
