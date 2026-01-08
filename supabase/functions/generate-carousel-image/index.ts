import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, carouselId, slideNumber } = await req.json();

    console.log(`[generate-carousel-image] Starting generation for carousel ${carouselId}, slide ${slideNumber}`);

    // Validate required fields
    if (!prompt) {
      console.error("[generate-carousel-image] Missing prompt");
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!carouselId || slideNumber === undefined) {
      console.error("[generate-carousel-image] Missing carouselId or slideNumber");
      return new Response(
        JSON.stringify({ error: "Carousel ID and slide number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI Gateway for image generation
    console.log("[generate-carousel-image] Calling Lovable AI Gateway...");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const geminiResponse = await fetch(
      "https://ai-gateway.lovable.dev/v1beta/models/google/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[generate-carousel-image] Lovable AI Gateway error:", geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt giới hạn API. Vui lòng thử lại sau.", errorCode: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (errorText.includes("CREDITS_EXHAUSTED") || errorText.includes("credits")) {
        return new Response(
          JSON.stringify({ error: "Đã hết credits AI. Vui lòng nâng cấp.", errorCode: "CREDITS_EXHAUSTED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Lỗi từ AI Gateway: " + errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("[generate-carousel-image] Lovable AI response received");

    // Extract image data from response
    let imageBase64: string | null = null;
    let mimeType = "image/png";

    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
      for (const part of geminiData.candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    }

    if (!imageBase64) {
      console.error("[generate-carousel-image] No image data in response:", JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: "Không thể tạo ảnh. AI không trả về dữ liệu ảnh." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `${carouselId}/slide-${slideNumber}-${Date.now()}.${extension}`;

    console.log(`[generate-carousel-image] Uploading to storage: ${fileName}`);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("carousel-images")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[generate-carousel-image] Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Lỗi upload ảnh: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("carousel-images")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log(`[generate-carousel-image] Image uploaded successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        slideNumber,
        carouselId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-carousel-image] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
