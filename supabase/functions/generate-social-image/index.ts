import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  prompt: string;
  contentId?: string;
  channel?: string;
  size?: string;
  aspectRatio?: string;
  organizationId?: string;
}

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Generate image using Lovable AI Gateway (Gemini 3 Pro Image)
 */
async function generateWithLovableAI(prompt: string, apiKey: string): Promise<ImageResult> {
  console.log("[generate-social-image] Using Lovable AI Gateway");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[generate-social-image] Lovable AI error:", response.status, errorText);
    
    if (response.status === 429) {
      return { success: false, error: "Đã vượt giới hạn API. Vui lòng thử lại sau hoặc nạp thêm credits." };
    }
    if (response.status === 402) {
      return { success: false, error: "Hết credits. Vui lòng nạp thêm credits tại Settings → Workspace → Usage." };
    }
    return { success: false, error: `Lỗi tạo ảnh: ${errorText}` };
  }

  const data = await response.json();
  
  // Extract image from response
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageData) {
    console.error("[generate-social-image] No image in response:", JSON.stringify(data).substring(0, 500));
    return { success: false, error: "AI không trả về dữ liệu ảnh." };
  }

  return { success: true, imageUrl: imageData };
}

/**
 * Upload base64 image to Supabase storage
 */
async function uploadToStorage(
  imageBase64: string,
  contentId: string,
  channel: string,
  organizationId?: string
): Promise<{ url: string } | { error: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  // Convert base64 to Uint8Array using chunked approach to avoid stack overflow
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  
  // Process in chunks to avoid stack size issues
  const chunkSize = 8192;
  for (let i = 0; i < binaryString.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, binaryString.length);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }

  const timestamp = Date.now();
  const orgPath = organizationId ? `org-${organizationId}` : 'unassigned';
  const fileName = `social/${orgPath}/${contentId}/${channel}-${timestamp}.png`;

  console.log(`[generate-social-image] Uploading to storage: ${fileName}`);

  const { error: uploadError } = await supabase.storage
    .from("carousel-images")
    .upload(fileName, bytes, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("[generate-social-image] Storage upload error:", uploadError);
    return { error: `Lỗi upload ảnh: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from("carousel-images")
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl };
}

/**
 * Save image to history
 */
async function saveToHistory(
  contentId: string,
  channel: string,
  imageUrl: string,
  prompt: string,
  aspectRatio: string,
  organizationId?: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, unselect any currently selected images for this content+channel
    await supabase
      .from("channel_image_history")
      .update({ is_selected: false })
      .eq("content_id", contentId)
      .eq("channel", channel);

    // Insert new image as selected
    const { error } = await supabase
      .from("channel_image_history")
      .insert({
        content_id: contentId,
        channel,
        image_url: imageUrl,
        prompt,
        aspect_ratio: aspectRatio,
        is_selected: true,
        organization_id: organizationId,
      });

    if (error) {
      console.error("[generate-social-image] Failed to save to history:", error);
    } else {
      console.log("[generate-social-image] Saved to image history");
    }
  } catch (err) {
    console.error("[generate-social-image] Error saving to history:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { prompt, contentId, channel, size, aspectRatio, organizationId } = body;

    console.log(`[generate-social-image] Request - Channel: ${channel}, ContentId: ${contentId?.substring(0, 8)}`);

    // Validate required fields
    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Lovable API Key from environment
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("[generate-social-image] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Image generation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate image using Lovable AI
    const result = await generateWithLovableAI(prompt, lovableApiKey);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalImageUrl = result.imageUrl;

    // If we have base64 data and storage params, upload to storage
    if (result.imageUrl?.startsWith('data:') && contentId && channel) {
      const uploadResult = await uploadToStorage(
        result.imageUrl,
        contentId,
        channel,
        organizationId
      );
      
      if ('error' in uploadResult) {
        return new Response(
          JSON.stringify({ success: false, error: uploadResult.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      finalImageUrl = uploadResult.url;

      // Save to history
      await saveToHistory(
        contentId,
        channel,
        finalImageUrl,
        prompt,
        aspectRatio || size || '1:1',
        organizationId
      );
    }

    console.log(`[generate-social-image] Success - Image URL: ${finalImageUrl?.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        channel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-social-image] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
