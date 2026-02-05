import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EditBackgroundRequest {
  imageUrl: string;
  editType: 'remove' | 'solid_color' | 'gradient' | 'custom_scene';
  solidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: 'vertical' | 'horizontal' | 'diagonal';
  customScenePrompt?: string;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}

function buildEditPrompt(request: EditBackgroundRequest): string {
  switch (request.editType) {
    case 'remove':
      return `Remove the background completely and make it transparent. 
Keep only the main subject with clean, precise edges. 
The output should have alpha transparency for the background area.
Preserve all details of the subject - do not modify, crop, or change the main subject in any way.
The subject should be perfectly cut out with smooth, anti-aliased edges.`;

    case 'solid_color':
      const color = request.solidColor || '#ffffff';
      return `Replace the entire background with a solid ${color} color.
Keep the main subject completely intact with natural, clean edges.
Maintain the original lighting and shadows on the subject to look realistic.
Do not modify the subject itself - only replace the background.
Ensure the transition between subject and background is smooth and professional.`;

    case 'gradient':
      const from = request.gradientFrom || '#6366f1';
      const to = request.gradientTo || '#ec4899';
      const direction = request.gradientDirection || 'vertical';
      const directionText = direction === 'vertical' 
        ? 'top to bottom' 
        : direction === 'horizontal' 
          ? 'left to right' 
          : 'top-left corner to bottom-right corner (diagonal)';
      return `Replace the background with a smooth, beautiful gradient.
Gradient colors: from ${from} to ${to}
Direction: ${directionText}
Keep the main subject completely intact with natural integration.
The gradient should be smooth and professional, without banding artifacts.
Adjust the subject's edge lighting subtly to match the new background colors.`;

    case 'custom_scene':
      const scene = request.customScenePrompt || 'professional studio background';
      return `Replace the background with: ${scene}

CRITICAL INSTRUCTIONS:
- Keep the main subject EXACTLY as it is - do not modify, resize, or change the subject in any way
- Only replace the background environment
- Make the integration look natural with appropriate lighting that matches the new scene
- The subject should appear naturally placed in the new environment
- Adjust edge lighting and shadows to blend seamlessly with the new background
- Maintain the original quality and details of the subject`;

    default:
      return 'Remove the background and make it transparent.';
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: EditBackgroundRequest = await req.json();
    
    // Validate required fields
    if (!request.imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!request.editType) {
      return new Response(
        JSON.stringify({ success: false, error: "editType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[edit-image-background] Processing ${request.editType} for image`);

    const editPrompt = buildEditPrompt(request);
    console.log(`[edit-image-background] Prompt: ${editPrompt.slice(0, 100)}...`);

    // Call Gemini with image editing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: editPrompt },
            { type: "image_url", image_url: { url: request.imageUrl } }
          ]
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[edit-image-background] AI gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Đã vượt giới hạn request. Vui lòng thử lại sau ít phút.",
            errorCode: "RATE_LIMIT"
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Cần nạp thêm credits để sử dụng tính năng này.",
            errorCode: "PAYMENT_REQUIRED"
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!editedImageUrl) {
      console.error("[edit-image-background] No image in response", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "AI không thể xử lý ảnh này. Vui lòng thử với ảnh khác.",
          details: assistantMessage 
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[edit-image-background] Success - generated ${request.editType} background edit`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: editedImageUrl,
        editType: request.editType,
        message: assistantMessage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[edit-image-background] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
