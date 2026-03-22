import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTraceId, saveMetrics, estimateTokens } from "../_shared/logger.ts";
import { estimateCost } from "../_shared/cost-estimator.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SceneData {
  sceneNumber: number;
  promptText: string;
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
}

Deno.serve(withPerf({ functionName: 'generate-scene-thumbnail', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const traceId = generateTraceId();
  const startTime = performance.now();

  try {
    const { scene } = await req.json() as { scene: SceneData };

    if (!scene) {
      return new Response(
        JSON.stringify({ error: "Scene data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build comprehensive image generation prompt from scene data
    const imagePrompt = buildSceneImagePrompt(scene);

    // Call Lovable AI with image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add funds to your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate scene image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Non-blocking metrics save
    const totalDurationMs = Math.round(performance.now() - startTime);
    const model = "google/gemini-3-pro-image-preview";
    const inputTokens = estimateTokens(imagePrompt);
    const estimatedCostUsd = estimateCost(model, inputTokens, 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    saveMetrics(supabase, {
      traceId,
      functionName: 'generate-scene-thumbnail',
      totalDurationMs,
      aiCallDurationMs: totalDurationMs,
      inputTokensEstimated: inputTokens,
      outputTokensEstimated: 0,
      estimatedCostUsd,
      modelsUsed: { image: model },
      hadError: false,
      contextSources: [],
      actionType: 'image_generation',
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        imageUrl,
        sceneNumber: scene.sceneNumber,
        prompt: imagePrompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating scene thumbnail:", error);

    // Save error metrics
    const totalDurationMs = Math.round(performance.now() - startTime);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      saveMetrics(supabase, {
        traceId,
        functionName: 'generate-scene-thumbnail',
        totalDurationMs,
        hadError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        contextSources: [],
        actionType: 'image_generation',
      }).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Build a comprehensive image generation prompt from scene data
 */
function buildSceneImagePrompt(scene: SceneData): string {
  const parts: string[] = [];

  // Main scene description
  parts.push(`Scene ${scene.sceneNumber}: ${scene.promptText}`);
  parts.push("");

  // Camera and visual direction
  parts.push("CAMERA & COMPOSITION:");
  parts.push(`- Angle: ${scene.visualDirection.cameraAngle}`);
  parts.push(`- Movement: ${scene.visualDirection.cameraMovement}`);
  parts.push("");

  // Lighting and mood
  parts.push("LIGHTING & MOOD:");
  parts.push(`- Lighting: ${scene.visualDirection.lighting}`);
  parts.push(`- Emotional Tone: ${scene.emotionalTone}`);
  parts.push("");

  // Setting and props
  parts.push("SETTING & ELEMENTS:");
  parts.push(`- Background: ${scene.visualDirection.backgroundSetting}`);
  if (scene.visualDirection.props.length > 0) {
    parts.push(`- Props: ${scene.visualDirection.props.join(", ")}`);
  }
  parts.push("");

  // Actions and movement
  if (scene.visualDirection.actions.length > 0) {
    parts.push("ACTIONS:");
    scene.visualDirection.actions.forEach((action) => {
      parts.push(`- ${action}`);
    }));
    parts.push("");
  }

  // Additional context
  parts.push("STYLE:");
  parts.push("- Create a cinematic, professional-looking scene thumbnail");
  parts.push("- Resolution: 16:9 aspect ratio");
  parts.push("- High production quality, suitable for video storyboard preview");
  if (scene.visualDirection.textOverlay) {
    parts.push(`- Note: This scene should include text overlay: "${scene.visualDirection.textOverlay}"`);
  }

  return parts.join("\n");
}
