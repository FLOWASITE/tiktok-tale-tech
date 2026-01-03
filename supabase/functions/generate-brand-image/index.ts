import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

interface BrandColors {
  primaryColor: string;
  secondaryColors: string[];
  imageStyle: string | null;
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
      aspectRatio = "16:9",
    }: GenerateImageRequest = await req.json();

    console.log(`[generate-brand-image] Generating for channel: ${channel}, content: ${contentId}`);

    // Fetch brand template for colors and style
    const { data: brandTemplate, error: brandError } = await supabase
      .from("brand_templates")
      .select("primary_color, secondary_colors, image_style, logo_url, brand_name")
      .eq("id", brandTemplateId)
      .single();

    if (brandError || !brandTemplate) {
      console.error("[generate-brand-image] Brand template not found:", brandError);
      throw new Error("Brand template not found");
    }

    const primaryColor = brandTemplate.primary_color || "#6366f1";
    const secondaryColors = brandTemplate.secondary_colors || [];
    const imageStyle = brandTemplate.image_style || "professional, modern, clean";

    // Map aspect ratio to size
    const sizeMap: Record<string, string> = {
      "16:9": "1920x1080",
      "1:1": "1024x1024",
      "9:16": "1080x1920",
      "4:5": "1080x1350",
    };
    const imageSize = sizeMap[aspectRatio] || "1920x1080";

    // Build enhanced prompt with brand colors
    const colorPalette = [primaryColor, ...secondaryColors.slice(0, 3)].join(", ");
    
    const enhancedPrompt = `
Create a ${aspectRatio} aspect ratio social media image for ${channel} channel.

STRICT COLOR REQUIREMENTS:
- Primary color that MUST dominate: ${primaryColor}
- Accent colors to use: ${colorPalette}
- The image MUST prominently feature these exact colors throughout the composition.
- Use gradients, overlays, and color blocks with these colors.

STYLE DIRECTION:
- Visual style: ${imageStyle}
- Professional, high-quality, suitable for ${channel} social media
- Clean composition with visual hierarchy
- Modern aesthetic with depth and dimension

CONTENT THEME:
${contentSummary}

CRITICAL RULES:
- DO NOT include any text, words, letters, or typography in the image
- DO NOT include any logos or brand marks
- The image should be purely visual/illustrative
- Focus on abstract shapes, patterns, or conceptual imagery that represents the theme
- Ultra high resolution, crisp details, professional quality
`.trim();

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
      .from("carousel-images") // Reusing existing bucket
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

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        prompt: enhancedPrompt,
        brandColors: {
          primary: primaryColor,
          secondary: secondaryColors,
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
