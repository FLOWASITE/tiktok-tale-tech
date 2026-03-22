import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt, isEncryptionConfigured } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EncryptRequest {
  apiKey: string;
  providerId: string;
}

Deno.serve(withPerf({ functionName: 'encrypt-api-key' }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if encryption is configured
    if (!isEncryptionConfigured()) {
      console.warn("[encrypt-api-key] AI_ENCRYPTION_KEY not configured, storing plain");
    }

    const { apiKey, providerId }: EncryptRequest = await req.json();

    if (!apiKey || !providerId) {
      return new Response(
        JSON.stringify({ error: "Missing apiKey or providerId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt the API key if encryption is configured
    let encryptedKey: string;
    if (isEncryptionConfigured()) {
      encryptedKey = await encrypt(apiKey);
      console.log("[encrypt-api-key] API key encrypted successfully");
    } else {
      // Store as-is if no encryption key (not recommended for production)
      encryptedKey = apiKey;
      console.warn("[encrypt-api-key] Storing API key without encryption");
    }

    // Update the provider config with encrypted key
    const { error: updateError } = await supabase
      .from("ai_provider_configs")
      .update({ encrypted_api_key: encryptedKey })
      .eq("id", providerId);

    if (updateError) {
      console.error("[encrypt-api-key] Update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save encrypted key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        encrypted: isEncryptionConfigured(),
        message: "API key saved successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[encrypt-api-key] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
