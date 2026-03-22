import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SceneData {
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
}

interface BRollKeyword {
  keyword: string;
  category: 'stock_footage' | 'animation' | 'text_overlay' | 'effect' | 'music';
  searchTerm: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

Deno.serve(withPerf({ functionName: 'extract-broll-keywords', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Use AI to extract B-Roll keywords
    const extractionPrompt = buildExtractionPrompt(scene);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a video production expert. Extract B-Roll keywords from scene data and return JSON only.",
          },
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to extract B-Roll keywords" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No keywords generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    let keywords: BRollKeyword[] = [];
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        keywords = parsed.keywords || parsed;
      }
    } catch (parseError) {
      console.error("Failed to parse keywords JSON:", parseError);
      // Fallback: return basic keywords extracted from scene
      keywords = extractBasicKeywords(scene);
    }

    return new Response(
      JSON.stringify({
        sceneNumber: scene.sceneNumber,
        keywords: keywords.slice(0, 8), // Limit to 8 keywords
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting B-Roll keywords:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));

function buildExtractionPrompt(scene: SceneData): string {
  return `Extract B-Roll keywords for this video scene. Return JSON with keywords array.

SCENE DATA:
- Number: ${scene.sceneNumber}
- Prompt: ${scene.promptText}
- Duration: ${scene.duration}s
- Emotional Tone: ${scene.emotionalTone}
- Camera Angle: ${scene.visualDirection.cameraAngle}
- Camera Movement: ${scene.visualDirection.cameraMovement}
- Lighting: ${scene.visualDirection.lighting}
- Background: ${scene.visualDirection.backgroundSetting}
- Props: ${scene.visualDirection.props.join(", ") || "None"}
- Actions: ${scene.visualDirection.actions.join(", ") || "None"}
${scene.visualDirection.textOverlay ? `- Text Overlay: "${scene.visualDirection.textOverlay}"` : ""}

INSTRUCTIONS:
Extract 5-8 B-Roll keywords in these categories:
- stock_footage: Real video clips (landscape, office, etc)
- animation: Motion graphics (charts, arrows, transitions)
- text_overlay: Text elements and graphics
- effect: Visual effects (transitions, filters)
- music: Background music mood

Return ONLY valid JSON:
{
  "keywords": [
    {
      "keyword": "Stock footage of...",
      "category": "stock_footage|animation|text_overlay|effect|music",
      "searchTerm": "exact search term",
      "description": "brief description",
      "priority": "high|medium|low"
    }
  ]
}`;
}

/**
 * Fallback: Extract basic keywords from scene data
 */
function extractBasicKeywords(scene: SceneData): BRollKeyword[] {
  const keywords: BRollKeyword[] = [];

  // Extract from props
  scene.visualDirection.props.forEach((prop) => {
    keywords.push({
      keyword: `${prop} footage`,
      category: "stock_footage",
      searchTerm: prop,
      description: `Stock footage of ${prop}`,
      priority: "high",
    });
  });

  // Extract from background
  keywords.push({
    keyword: scene.visualDirection.backgroundSetting,
    category: "stock_footage",
    searchTerm: scene.visualDirection.backgroundSetting,
    description: `Scene background: ${scene.visualDirection.backgroundSetting}`,
    priority: "high",
  });

  // Extract from actions
  if (scene.visualDirection.actions.length > 0) {
    keywords.push({
      keyword: `${scene.visualDirection.actions[0]} action`,
      category: "stock_footage",
      searchTerm: scene.visualDirection.actions[0],
      description: `B-Roll: ${scene.visualDirection.actions[0]}`,
      priority: "medium",
    });
  }

  // Emotional tone -> music suggestion
  const moodMap: Record<string, string> = {
    "Confident": "upbeat corporate background music",
    "Excited": "energetic upbeat music",
    "Serious": "dramatic intense music",
    "Friendly": "warm cheerful music",
    "Curious": "mysterious ambient music",
    "Neutral": "subtle neutral background music",
    "Urgent": "fast-paced urgent music",
  };

  keywords.push({
    keyword: moodMap[scene.emotionalTone] || "background music",
    category: "music",
    searchTerm: scene.emotionalTone.toLowerCase(),
    description: `Background music for ${scene.emotionalTone} mood`,
    priority: "medium",
  });

  return keywords.slice(0, 8);
}
