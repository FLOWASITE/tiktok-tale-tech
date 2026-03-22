import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MusicGenerationRequest {
  moodDescription: string;
  duration: number; // 1-30 seconds
  style?: string;
  intensity?: 'low' | 'medium' | 'high';
}

Deno.serve(withPerf({ functionName: 'generate-music', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moodDescription, duration, style = 'cinematic', intensity = 'medium' } = 
      await req.json() as MusicGenerationRequest;

    if (!moodDescription || !duration) {
      return new Response(
        JSON.stringify({ error: "moodDescription and duration are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (duration < 1 || duration > 30) {
      return new Response(
        JSON.stringify({ error: "Duration must be between 1 and 30 seconds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build comprehensive music prompt
    const musicPrompt = buildMusicPrompt(moodDescription, style, intensity);

    console.log("[generate-music] Generating music:", { moodDescription, duration, style, intensity });

    const response = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        duration_seconds: duration,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-music] API error:", response.status, errorText);

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
        JSON.stringify({ error: "Failed to generate music" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = base64Encode(new Uint8Array(audioBuffer));

    console.log("[generate-music] Music generated successfully, size:", audioBuffer.byteLength);

    return new Response(
      JSON.stringify({
        audioBase64: base64Audio,
        duration,
        moodDescription,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-music] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));

/**
 * Build comprehensive music generation prompt
 */
function buildMusicPrompt(mood: string, style: string, intensity: 'low' | 'medium' | 'high'): string {
  const intensityMap = {
    low: "calm, subtle",
    medium: "balanced, engaging",
    high: "energetic, powerful",
  };

  return `Generate ${intensityMap[intensity]} background music.

Mood: ${mood}
Style: ${style}
Purpose: Professional video background music
Requirements:
- No vocals or dialogue
- Royalty-free suitable for commercial use
- Production quality: Professional broadcast-ready
- Emotional tone matches: ${mood}`;
}
