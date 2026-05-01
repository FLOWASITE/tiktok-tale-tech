// ============================================
// generate-video-prompt
// Brand + Industry-aware video prompt builder.
// Input: user's raw idea (Vietnamese OK), channel, aspect_ratio, duration, brand_id, industry_id (optional)
// Output: cinematic English prompt + Vietnamese caption hint + negative prompt
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromptRequest {
  idea: string;
  channel?: 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'facebook' | 'generic';
  aspect_ratio?: '9:16' | '16:9' | '1:1';
  duration?: number;
  brand_id?: string;
  industry_id?: string;
  language?: 'vi' | 'en' | 'th';
  tone?: string;
  character_profile_id?: string;
  character_profile_ids?: string[];
}

interface PromptResponse {
  cinematic_prompt: string;       // English, fed to Veo/Sora/Seedance
  caption_hint: string;           // Native language caption suggestion
  negative_prompt: string;
  scene_breakdown?: string[];     // Optional for multi-scene
  recommended_voiceover?: string;
  recommended_music_mood?: string;
}

Deno.serve(withPerf({ functionName: 'generate-video-prompt', slowThresholdMs: 20000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PromptRequest = await req.json();
    const {
      idea,
      channel = 'tiktok',
      aspect_ratio = '9:16',
      duration = 5,
      brand_id,
      industry_id,
      language = 'vi',
      tone,
      character_profile_id,
    } = body;

    if (!idea || idea.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Idea too short" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch brand context (voice, tone, do/don't)
    let brandContext = '';
    if (brand_id) {
      const { data: brand } = await supabase
        .from('brand_templates')
        .select('name, tone_of_voice, do_list, dont_list, target_audience, brand_personality')
        .eq('id', brand_id)
        .maybeSingle();
      if (brand) {
        brandContext = `\nBRAND: ${brand.name}\nTONE: ${brand.tone_of_voice ?? tone ?? 'professional'}\nAUDIENCE: ${brand.target_audience ?? 'general'}\nPERSONALITY: ${brand.brand_personality ?? ''}\nDO: ${(brand.do_list ?? []).join(', ')}\nDON'T: ${(brand.dont_list ?? []).join(', ')}`;
      }
    }

    // Fetch industry context (forbidden terms, claim restrictions)
    let industryContext = '';
    if (industry_id) {
      const { data: industry } = await supabase
        .from('industry_templates')
        .select('name, forbidden_terms, required_disclaimers, tone_guidance')
        .eq('id', industry_id)
        .maybeSingle();
      if (industry) {
        industryContext = `\nINDUSTRY: ${industry.name}\nFORBIDDEN: ${(industry.forbidden_terms ?? []).join(', ')}\nDISCLAIMERS: ${(industry.required_disclaimers ?? []).join(', ')}`;
      }
    }

    // Fetch character profile for consistency
    let characterContext = '';
    if (character_profile_id) {
      const { data: charProfile } = await supabase
        .from('character_profiles')
        .select('name, description, appearance, wardrobe')
        .eq('id', character_profile_id)
        .maybeSingle();
      if (charProfile) {
        const app = (charProfile.appearance || {}) as Record<string, string>;
        const traits: string[] = [];
        if (app.gender) traits.push(app.gender);
        if (app.age_range) traits.push(`age ${app.age_range}`);
        if (app.hair) traits.push(`${app.hair} hair`);
        if (app.skin_tone) traits.push(`${app.skin_tone} skin`);
        if (app.distinctive_features) traits.push(app.distinctive_features);
        characterContext = `\nCHARACTER "${charProfile.name}": ${traits.join(', ')}. ${charProfile.description || ''}${charProfile.wardrobe ? ` Wearing: ${charProfile.wardrobe}.` : ''}\nCRITICAL: The generated prompt MUST describe this character's appearance precisely so the video maintains character consistency across scenes.`;
      }
    }

    // Channel-specific cinematic guidance
    const channelGuidance: Record<string, string> = {
      tiktok: 'Vertical 9:16, hook in first 1.5s, fast cuts, trending text-on-screen style, vibrant colors, handheld feel.',
      reels: 'Vertical 9:16, polished cinematic look, smooth camera glides, color-graded, Instagram aesthetic.',
      shorts: 'Vertical 9:16, punchy hook, clean composition, YouTube Shorts pacing.',
      youtube: 'Landscape 16:9, cinematic wide shots, slow camera movement, high production value.',
      facebook: 'Square or 9:16, attention-grabbing first frame, captions-friendly composition.',
      generic: 'Balanced composition, neutral cinematic style.',
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const langName = language === 'vi' ? 'Vietnamese' : language === 'th' ? 'Thai' : 'English';

    const systemPrompt = `You are an expert video director who writes cinematic prompts for AI video models (Veo 3.1, Sora 2, Seedance 2).

INSTRUCTION (English): Build a structured response.
TARGET LANGUAGE for caption_hint: ${langName}.
OUTPUT FORMAT: Strict JSON only, no markdown.

Cinematic prompt rules:
- Always English (video models perform best in English).
- Include: subject, action, setting, lighting, camera (angle + movement), mood, color palette, lens hint.
- Under 480 characters.
- Avoid forbidden terms from industry context.
- Aspect ratio: ${aspect_ratio}, Duration: ${duration}s.
- Channel guidance: ${channelGuidance[channel] ?? channelGuidance.generic}

Caption hint: native ${langName} short caption (under 100 chars), ready for the channel.

Negative prompt: comma-separated terms to avoid (low quality, distorted faces, watermark, extra fingers, etc.) plus brand/industry-forbidden visual cues.

Return JSON shape:
{
  "cinematic_prompt": "...",
  "caption_hint": "...",
  "negative_prompt": "...",
  "scene_breakdown": ["scene1", "scene2"],
  "recommended_voiceover": "short ${langName} VO line",
  "recommended_music_mood": "e.g. uplifting cinematic, lo-fi calm, dramatic orchestral"
}`;

    const userPrompt = `IDEA: ${idea}\n${brandContext}${industryContext}${characterContext}\n\nReturn the JSON now.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[generate-video-prompt] AI error:', aiResponse.status, errText.slice(0, 300));
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? '{}';

    let parsed: PromptResponse;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('[generate-video-prompt] JSON parse failed:', content.slice(0, 200));
      // Fallback: return raw idea as prompt
      parsed = {
        cinematic_prompt: idea,
        caption_hint: idea,
        negative_prompt: 'low quality, blurry, distorted, watermark',
      };
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-video-prompt] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
