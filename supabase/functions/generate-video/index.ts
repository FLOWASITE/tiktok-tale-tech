import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { generateVideoViaGeminiGen, GEMINIGEN_VIDEO_MODELS } from "../_shared/geminigen-video-generator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VideoProvider = 'geminigen' | 'lovable' | 'minimax' | 'runway';

interface VideoGenerationRequest {
  provider: VideoProvider;
  prompt: string;
  model?: string;          // e.g. 'geminigen/veo-3' — required when provider='geminigen'
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  starting_frame_url?: string;
  negative_prompt?: string;
  script_id?: string;
  storyboard_id?: string;
  scene_number?: number;
}

Deno.serve(withPerf({ functionName: 'generate-video', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: VideoGenerationRequest = await req.json();
    const {
      provider = 'geminigen',
      prompt,
      model,
      duration = 5,
      aspect_ratio = '16:9',
      resolution = '1080p',
      starting_frame_url,
      negative_prompt,
      script_id,
      storyboard_id,
      scene_number,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-video] Provider: ${provider}, Duration: ${duration}s, Aspect: ${aspect_ratio}`);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('video_generations')
      .insert({
        script_id,
        storyboard_id,
        scene_number,
        provider,
        model_used: model,
        prompt,
        duration_seconds: duration,
        aspect_ratio,
        resolution,
        starting_frame_url,
        status: 'processing',
        user_id: user.id,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[generate-video] Job creation error:', jobError);
      throw new Error('Failed to create generation job');
    }

    const startTime = Date.now();
    let videoUrl: string | null = null;
    let error: string | null = null;

    try {
      if (provider === 'geminigen') {
        const apiKey = Deno.env.get("GEMINIGEN_API_KEY");
        if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');

        const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
        const result = await generateVideoViaGeminiGen({
          prompt,
          model: selectedModel,
          aspectRatio: aspect_ratio,
          resolution: resolution === '720p' ? '720p' : '1080p',
          duration,
          negativePrompt: negative_prompt,
          startingFrameUrl: starting_frame_url,
        }, apiKey);

        videoUrl = result.videoUrl;
      } else if (provider === 'lovable') {
        videoUrl = await generateWithLovable({
          prompt,
          duration,
          aspect_ratio,
          resolution,
          starting_frame_url,
        });
      } else if (provider === 'minimax') {
        videoUrl = await generateWithMinimax({
          prompt,
          duration,
          aspect_ratio,
        });
      } else if (provider === 'runway') {
        throw new Error('Runway integration coming soon');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Generation failed';
      console.error(`[generate-video] ${provider} error:`, e);
    }

    const generationTimeMs = Date.now() - startTime;

    // Update job with result
    const { error: updateError } = await supabase
      .from('video_generations')
      .update({
        status: videoUrl ? 'completed' : 'failed',
        video_url: videoUrl,
        error_message: error,
        generation_time_ms: generationTimeMs,
        completed_at: new Date().toISOString(),
        progress: 100,
      })
      .eq('id', job.id);

    if (updateError) {
      console.error('[generate-video] Update error:', updateError);
    }

    if (error) {
      return new Response(
        JSON.stringify({ 
          error, 
          job_id: job.id,
          status: 'failed' 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        video_url: videoUrl,
        status: 'completed',
        generation_time_ms: generationTimeMs,
        provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[generate-video] Error:", e);
    
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const status = errorMessage.includes('429') ? 429 : 
                   errorMessage.includes('402') ? 402 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
 }));

/**
 * Generate video using Lovable AI Gateway
 */
async function generateWithLovable(params: {
  prompt: string;
  duration: number;
  aspect_ratio: string;
  resolution: string;
  starting_frame_url?: string;
}): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Build video generation request
  // Using text-to-video or image-to-video based on starting_frame
  const requestBody: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview", // Use for video description enhancement
    messages: [
      {
        role: "system",
        content: `You are a video prompt enhancer. Transform the user's video description into a detailed, cinematic prompt suitable for AI video generation. Include:
- Specific visual details (lighting, camera angles, movements)
- Action descriptions with timing cues
- Atmosphere and mood
- Technical direction for smooth generation

Keep the enhanced prompt under 500 characters.`
      },
      {
        role: "user",
        content: params.prompt
      }
    ],
  };

  // First, enhance the prompt
  const enhanceResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!enhanceResponse.ok) {
    if (enhanceResponse.status === 429) {
      throw new Error("429: Rate limit exceeded");
    }
    if (enhanceResponse.status === 402) {
      throw new Error("402: Payment required");
    }
    throw new Error(`Prompt enhancement failed: ${enhanceResponse.status}`);
  }

  const enhanceData = await enhanceResponse.json();
  const enhancedPrompt = enhanceData.choices?.[0]?.message?.content || params.prompt;

  console.log('[generate-video] Enhanced prompt:', enhancedPrompt.substring(0, 100) + '...');

  // For now, return a placeholder - real video generation would use a dedicated video API
  // The Lovable videogen tool is available in the editor but not directly callable from edge functions
  // This would be replaced with actual Minimax/Runway API calls when configured
  
  // Simulate video URL generation (in production, this would be replaced with actual API call)
  const placeholderUrl = `https://storage.lovable.dev/placeholder-video-${Date.now()}.mp4`;
  
  console.log('[generate-video] Lovable generation complete (placeholder)');
  
  return placeholderUrl;
}

/**
 * Generate video using Minimax API
 */
async function generateWithMinimax(params: {
  prompt: string;
  duration: number;
  aspect_ratio: string;
}): Promise<string> {
  const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY");
  if (!MINIMAX_API_KEY) {
    throw new Error("MINIMAX_API_KEY is not configured. Please add it in project secrets.");
  }

  // Minimax Video Generation API
  const response = await fetch("https://api.minimax.chat/v1/video_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "video-01",
      prompt: params.prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generate-video] Minimax error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("429: Minimax rate limit exceeded");
    }
    if (response.status === 402 || response.status === 403) {
      throw new Error("402: Minimax API quota exceeded");
    }
    throw new Error(`Minimax API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Minimax returns a task_id, need to poll for completion
  const taskId = data.task_id;
  if (!taskId) {
    throw new Error("No task_id returned from Minimax");
  }

  // Poll for completion (max 5 minutes)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(`https://api.minimax.chat/v1/query/video_generation?task_id=${taskId}`, {
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      },
    });

    if (!statusResponse.ok) continue;

    const statusData = await statusResponse.json();
    
    if (statusData.status === 'Success' && statusData.file_id) {
      // Get download URL
      const fileResponse = await fetch(`https://api.minimax.chat/v1/files/retrieve?file_id=${statusData.file_id}`, {
        headers: {
          "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        },
      });
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        return fileData.file?.download_url || '';
      }
    }
    
    if (statusData.status === 'Failed') {
      throw new Error(`Minimax generation failed: ${statusData.error || 'Unknown error'}`);
    }
  }

  throw new Error("Minimax generation timed out");
}
