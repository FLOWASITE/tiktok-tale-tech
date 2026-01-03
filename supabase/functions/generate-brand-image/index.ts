import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  buildImagePrompt, 
  getChannelAspectRatio,
  type Channel,
  type BrandImageContext,
  type PersonaContext,
  type ImageStylePreset,
} from "../_shared/image-prompt-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  contentId: string;
  channel: string;
  contentSummary: string;
  brandTemplateId: string;
  aspectRatio?: "16:9" | "1:1" | "9:16" | "4:5";
  journeyStage?: 'awareness' | 'consideration' | 'decision' | 'retention';
  contentType?: 'promotional' | 'educational' | 'entertainment' | 'inspirational';
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
}

// Map content_goal to journey stage
function mapContentGoalToJourneyStage(
  contentGoal?: string
): 'awareness' | 'consideration' | 'decision' | 'retention' | undefined {
  const mapping: Record<string, 'awareness' | 'consideration' | 'decision' | 'retention'> = {
    'brand_awareness': 'awareness',
    'engagement': 'awareness',
    'lead_generation': 'consideration',
    'traffic': 'consideration',
    'conversion': 'decision',
    'sales': 'decision',
    'retention': 'retention',
    'loyalty': 'retention',
  };
  return contentGoal ? mapping[contentGoal] : undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const {
      contentId,
      channel,
      contentSummary,
      brandTemplateId,
      aspectRatio,
      journeyStage,
      contentType,
      imageStylePreset,
      negativePrompt,
    }: GenerateImageRequest = await req.json();

    console.log(`[generate-brand-image] Generating for channel: ${channel}, content: ${contentId}`);

    // Fetch brand template for colors and style
    const { data: brandTemplate, error: brandError } = await supabase
      .from("brand_templates")
      .select("primary_color, secondary_colors, image_style, logo_url, brand_name, industry, organization_id")
      .eq("id", brandTemplateId)
      .single();

    if (brandError || !brandTemplate) {
      console.error("[generate-brand-image] Brand template not found:", brandError);
      throw new Error("Brand template not found");
    }

    // Fetch content goal if not provided journey stage
    let finalJourneyStage = journeyStage;
    if (!finalJourneyStage && contentId) {
      const { data: contentData } = await supabase
        .from("multi_channel_contents")
        .select("content_goal")
        .eq("id", contentId)
        .single();
      
      if (contentData?.content_goal) {
        finalJourneyStage = mapContentGoalToJourneyStage(contentData.content_goal);
        console.log(`[generate-brand-image] Mapped content_goal "${contentData.content_goal}" to journeyStage "${finalJourneyStage}"`);
      }
    }

    // Fetch primary persona for the brand
    let personaContext: PersonaContext | undefined;
    try {
      const { data: personaMapping } = await supabase
        .from("product_persona_mappings")
        .select(`
          customer_personas (
            name, 
            age_range, 
            gender, 
            occupation, 
            interests,
            communication_style
          )
        `)
        .eq("brand_template_id", brandTemplateId)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();

      if (personaMapping?.customer_personas) {
        const p = personaMapping.customer_personas as any;
        personaContext = {
          name: p.name,
          ageRange: p.age_range,
          gender: p.gender,
          occupation: p.occupation,
          interests: p.interests,
          communicationStyle: p.communication_style,
        };
        console.log(`[generate-brand-image] Using persona context: ${personaContext.name}`);
      }
    } catch (personaErr) {
      console.warn("[generate-brand-image] Failed to fetch persona, continuing without:", personaErr);
    }

    // Determine aspect ratio - use provided or get optimal for channel
    const finalAspectRatio = aspectRatio || getChannelAspectRatio(channel as Channel);

    // Build brand context for enhanced prompt
    const brandContext: BrandImageContext = {
      brandName: brandTemplate.brand_name,
      brandColors: {
        primary: brandTemplate.primary_color || "#6366f1",
        secondary: brandTemplate.secondary_colors || [],
      },
      imageStyle: brandTemplate.image_style || "professional, modern, clean",
      logoUrl: brandTemplate.logo_url,
      industry: brandTemplate.industry || [],
    };

    // Build enhanced prompt using the shared utility
    const enhancedPrompt = buildImagePrompt({
      channel: channel as Channel,
      contentSummary,
      brand: brandContext,
      aspectRatio: finalAspectRatio,
      journeyStage: finalJourneyStage,
      contentType,
      persona: personaContext,
      imageStylePreset,
      negativePrompt,
    });

    console.log("[generate-brand-image] Calling Lovable AI Gateway with Gemini 3 Pro Image...");

    // Call Lovable AI Gateway with image generation model
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
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-brand-image] Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("[generate-brand-image] AI response received");

    // Extract image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("[generate-brand-image] No image in response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No image generated by AI");
    }

    // The image is base64 encoded, upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `${contentId}/${channel}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("carousel-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-brand-image] Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("carousel-images")
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;
    console.log("[generate-brand-image] Image uploaded:", imageUrl);

    // Save to channel_image_history
    try {
      // First, unselect any previously selected images for this content/channel
      await supabase
        .from("channel_image_history")
        .update({ is_selected: false })
        .eq("content_id", contentId)
        .eq("channel", channel);

      // Insert new image as selected
      const { error: historyError } = await supabase
        .from("channel_image_history")
        .insert({
          content_id: contentId,
          channel: channel,
          image_url: imageUrl,
          prompt: enhancedPrompt,
          aspect_ratio: finalAspectRatio,
          is_selected: true,
          organization_id: brandTemplate.organization_id,
        });

      if (historyError) {
        console.error("[generate-brand-image] Failed to save to history:", historyError);
        // Don't throw - history save is non-critical
      } else {
        console.log("[generate-brand-image] Saved to channel_image_history");
      }
    } catch (historyErr) {
      console.error("[generate-brand-image] History save error:", historyErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        aspectRatio: finalAspectRatio,
        brandColors: {
          primary: brandContext.brandColors?.primary,
          secondary: brandContext.brandColors?.secondary,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-brand-image] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
