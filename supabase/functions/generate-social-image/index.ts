import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderType = 'gemini' | 'openai' | 'replicate' | 'custom';

interface GenerateRequest {
  prompt: string;
  provider: ProviderType;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  contentId?: string;
  channel?: string;
  size?: string;
}

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
}

// Generate image using Gemini
async function generateWithGemini(prompt: string, apiKey: string): Promise<ImageResult> {
  console.log("[generate-social-image] Using Gemini provider");
  
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[generate-social-image] Gemini error:", response.status, errorText);
    
    if (response.status === 429) {
      return { success: false, error: "Đã vượt giới hạn API Gemini. Vui lòng thử lại sau." };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: "API key Gemini không hợp lệ." };
    }
    return { success: false, error: `Lỗi Gemini: ${errorText}` };
  }

  const data = await response.json();
  let imageBase64: string | null = null;

  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!imageBase64) {
    return { success: false, error: "Gemini không trả về dữ liệu ảnh." };
  }

  return { success: true, imageBase64 };
}

// Generate image using OpenAI DALL-E / gpt-image-1
async function generateWithOpenAI(prompt: string, apiKey: string, size: string = "1024x1024"): Promise<ImageResult> {
  console.log("[generate-social-image] Using OpenAI provider");
  
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt,
      n: 1,
      size: size,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[generate-social-image] OpenAI error:", response.status, errorText);
    
    if (response.status === 429) {
      return { success: false, error: "Đã vượt giới hạn API OpenAI. Vui lòng thử lại sau." };
    }
    if (response.status === 401) {
      return { success: false, error: "API key OpenAI không hợp lệ." };
    }
    return { success: false, error: `Lỗi OpenAI: ${errorText}` };
  }

  const data = await response.json();
  const imageBase64 = data.data?.[0]?.b64_json;

  if (!imageBase64) {
    return { success: false, error: "OpenAI không trả về dữ liệu ảnh." };
  }

  return { success: true, imageBase64 };
}

// Generate image using Replicate
async function generateWithReplicate(prompt: string, apiKey: string, model: string = "black-forest-labs/flux-schnell"): Promise<ImageResult> {
  console.log("[generate-social-image] Using Replicate provider with model:", model);
  
  const replicate = new Replicate({ auth: apiKey });

  try {
    const output = await replicate.run(model, {
      input: {
        prompt: prompt,
        go_fast: true,
        megapixels: "1",
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 80,
        num_inference_steps: 4,
      },
    });

    console.log("[generate-social-image] Replicate output:", output);

    // Replicate returns array of URLs
    if (Array.isArray(output) && output.length > 0) {
      return { success: true, imageUrl: output[0] };
    }

    return { success: false, error: "Replicate không trả về ảnh." };
  } catch (err) {
    console.error("[generate-social-image] Replicate error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Lỗi Replicate: ${message}` };
  }
}

// Generate image using Custom OpenAI-compatible API
async function generateWithCustom(
  prompt: string,
  apiKey: string,
  baseUrl: string,
  model: string,
  size: string = "1024x1024"
): Promise<ImageResult> {
  console.log("[generate-social-image] Using Custom provider:", baseUrl, model);
  
  const endpoint = `${baseUrl.replace(/\/$/, '')}/images/generations`;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      n: 1,
      size: size,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[generate-social-image] Custom API error:", response.status, errorText);
    return { success: false, error: `Lỗi Custom API: ${errorText}` };
  }

  const data = await response.json();
  
  // Try different response formats
  const imageBase64 = data.data?.[0]?.b64_json || data.data?.[0]?.b64;
  const imageUrl = data.data?.[0]?.url;

  if (imageBase64) {
    return { success: true, imageBase64 };
  }
  if (imageUrl) {
    return { success: true, imageUrl };
  }

  return { success: false, error: "Custom API không trả về dữ liệu ảnh." };
}

// Upload base64 image to Supabase storage
async function uploadToStorage(
  imageBase64: string,
  contentId: string,
  channel: string
): Promise<{ url: string } | { error: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Convert base64 to Uint8Array
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const fileName = `social/${contentId}/${channel}-${Date.now()}.png`;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GenerateRequest = await req.json();
    const { prompt, provider, apiKey, baseUrl, model, contentId, channel, size } = body;

    console.log(`[generate-social-image] Request - Provider: ${provider}, Channel: ${channel}`);

    // Validate required fields
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!provider) {
      return new Response(
        JSON.stringify({ error: "Provider is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate image based on provider
    let result: ImageResult;

    switch (provider) {
      case 'gemini':
        result = await generateWithGemini(prompt, apiKey);
        break;
      case 'openai':
        result = await generateWithOpenAI(prompt, apiKey, size || "1024x1024");
        break;
      case 'replicate':
        result = await generateWithReplicate(prompt, apiKey, model || "black-forest-labs/flux-schnell");
        break;
      case 'custom':
        if (!baseUrl || !model) {
          return new Response(
            JSON.stringify({ error: "Base URL and model are required for custom provider" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await generateWithCustom(prompt, apiKey, baseUrl, model, size || "1024x1024");
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we have base64, upload to storage
    let finalImageUrl = result.imageUrl;
    
    if (result.imageBase64 && contentId && channel) {
      const uploadResult = await uploadToStorage(result.imageBase64, contentId, channel);
      if ('error' in uploadResult) {
        return new Response(
          JSON.stringify({ error: uploadResult.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      finalImageUrl = uploadResult.url;
    } else if (result.imageBase64) {
      // Return base64 if no storage upload needed
      finalImageUrl = `data:image/png;base64,${result.imageBase64}`;
    }

    console.log(`[generate-social-image] Success - Image URL: ${finalImageUrl?.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        provider,
        channel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-social-image] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
