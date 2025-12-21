import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { geminiApiKey } = await req.json();

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[test-gemini-connection] Testing API key...");

    // Make a simple API call to verify the key works
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + geminiApiKey,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[test-gemini-connection] API error:", response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: "API key không hợp lệ" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Lỗi kết nối: " + response.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const models = data.models?.filter((m: any) => 
      m.name?.includes("gemini") && m.supportedGenerationMethods?.includes("generateContent")
    ) || [];

    console.log("[test-gemini-connection] Success! Found", models.length, "Gemini models");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Kết nối thành công!",
        modelsCount: models.length,
        imageGenerationSupported: models.some((m: any) => 
          m.name?.includes("image") || m.name?.includes("flash-exp")
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[test-gemini-connection] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
