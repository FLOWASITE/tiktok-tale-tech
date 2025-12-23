import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  brandName: string;
  positioning?: string;
  toneOfVoice?: string[];
  formalityLevel?: string;
  allowEmoji?: boolean;
  preferredWords?: string[];
  forbiddenWords?: string[];
  channels: string[];
}

const CHANNEL_PROMPTS: Record<string, string> = {
  facebook: "Facebook post (casual, engaging, 100-200 words, with CTA)",
  linkedin: "LinkedIn post (professional, B2B focused, 150-250 words, with hashtags)",
  instagram: "Instagram caption (short, trendy, with emojis if allowed, hashtags)",
  tiktok: "TikTok caption (hook-focused, trendy, viral-style, short)",
  twitter: "Twitter/X post (concise, under 280 chars, engaging)",
  email: "Email template with subject line and body (professional format)",
};

const FORMALITY_DESCRIPTIONS: Record<string, string> = {
  formal: "very formal and respectful tone",
  very_formal: "extremely formal and ceremonial tone",
  semi_formal: "semi-formal, balanced professional tone",
  casual: "casual and relaxed tone",
  very_casual: "very casual, friendly like talking to a friend",
  friendly: "warm and approachable tone",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "professional and business-oriented",
  friendly: "warm and friendly",
  authoritative: "confident and authoritative",
  playful: "fun and playful",
  empathetic: "understanding and empathetic",
  inspirational: "inspiring and motivational",
  educational: "informative and educational",
  conversational: "conversational like chatting",
};

serve(async (req) => {
  console.log("generate-sample-text: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    console.log("generate-sample-text: Request body:", JSON.stringify({
      brandName: body.brandName,
      channels: body.channels,
      toneOfVoice: body.toneOfVoice,
      formalityLevel: body.formalityLevel,
    }));
    
    const { 
      brandName, 
      positioning, 
      toneOfVoice = [], 
      formalityLevel = "semi_formal",
      allowEmoji = true,
      preferredWords = [],
      forbiddenWords = [],
      channels 
    } = body;

    if (!brandName || !channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ error: "brandName and channels are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the brand voice description
    const toneDesc = toneOfVoice.map(t => TONE_DESCRIPTIONS[t] || t).join(", ");
    const formalityDesc = FORMALITY_DESCRIPTIONS[formalityLevel] || formalityLevel;
    
    const brandContext = `
Brand Name: ${brandName}
${positioning ? `Brand Positioning: ${positioning}` : ""}
Tone of Voice: ${toneDesc || "neutral"}
Formality: ${formalityDesc}
${allowEmoji ? "Emojis are allowed and encouraged" : "Do NOT use any emojis"}
${preferredWords.length > 0 ? `Preferred words to use: ${preferredWords.join(", ")}` : ""}
${forbiddenWords.length > 0 ? `Forbidden words (NEVER use these): ${forbiddenWords.join(", ")}` : ""}
`.trim();

    const channelRequests = channels.map(channel => ({
      channel,
      prompt: CHANNEL_PROMPTS[channel] || "general marketing content"
    }));

    const systemPrompt = `You are a professional content writer for the brand "${brandName}". 
Write in Vietnamese language.
Follow the brand voice guidelines strictly.
Generate authentic, engaging content that reflects the brand personality.
DO NOT include any meta-commentary or explanations - just the content itself.`;

    const userPrompt = `Based on this brand profile:
${brandContext}

Generate sample content for each of these channels:
${channelRequests.map((c, i) => `${i + 1}. ${c.channel}: ${c.prompt}`).join("\n")}

Return a JSON object with channel names as keys and the generated content as values.
Example format: {"facebook": "content here...", "linkedin": "content here..."}
Only return the JSON, no other text.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON response
    let samples: Record<string, string>;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      samples = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: try to extract content
      samples = {};
      for (const channel of channels) {
        samples[channel] = content;
      }
    }

    return new Response(
      JSON.stringify({ samples }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-sample-text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
