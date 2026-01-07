import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformSettings {
  id?: string;
  platform: string;
  app_name?: string;
  consumer_key?: string;
  consumer_secret?: string;
  is_active?: boolean;
}

// Encryption helpers using Base64 encoding for simplicity
function encrypt(text: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.from(key.padEnd(32).slice(0, 32));
  const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText: string, key: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) return encryptedText;
    const iv = Buffer.from(ivHex, "hex");
    const keyBuffer = Buffer.from(key.padEnd(32).slice(0, 32));
    const decipher = createDecipheriv("aes-256-cbc", keyBuffer, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encryptedText;
  }
}

function maskCredential(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionKey = Deno.env.get("AI_ENCRYPTION_KEY") || "default-encryption-key-change-me";

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userToken = authHeader.replace("Bearer ", "");
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const method = req.method;

    // GET - List all platform settings
    if (method === "GET") {
      const { data: settings, error } = await supabase
        .from("social_platform_settings")
        .select("*")
        .order("platform");

      if (error) {
        console.error("Fetch error:", error);
        throw error;
      }

      // Mask credentials for response
      const maskedSettings = (settings || []).map((s) => ({
        ...s,
        consumer_key: s.consumer_key ? maskCredential(decrypt(s.consumer_key, encryptionKey)) : null,
        consumer_secret: s.consumer_secret ? maskCredential(decrypt(s.consumer_secret, encryptionKey)) : null,
        has_credentials: !!(s.consumer_key && s.consumer_secret),
      }));

      return new Response(JSON.stringify({ settings: maskedSettings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - Create or update platform settings
    if (method === "POST") {
      const body: PlatformSettings = await req.json();
      
      if (!body.platform) {
        return new Response(JSON.stringify({ error: "Platform is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Encrypt credentials
      const encryptedData: any = {
        platform: body.platform,
        app_name: body.app_name || null,
        is_active: body.is_active !== false,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (body.consumer_key) {
        encryptedData.consumer_key = encrypt(body.consumer_key, encryptionKey);
      }
      if (body.consumer_secret) {
        encryptedData.consumer_secret = encrypt(body.consumer_secret, encryptionKey);
      }

      // Upsert (update or insert)
      const { data, error } = await supabase
        .from("social_platform_settings")
        .upsert(encryptedData, { onConflict: "platform" })
        .select()
        .single();

      if (error) {
        console.error("Upsert error:", error);
        throw error;
      }

      console.log(`Platform settings saved for ${body.platform} by user ${user.id}`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `${body.platform} settings saved successfully`,
        platform: body.platform 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Remove platform settings
    if (method === "DELETE") {
      const url = new URL(req.url);
      const platform = url.searchParams.get("platform");

      if (!platform) {
        return new Response(JSON.stringify({ error: "Platform is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("social_platform_settings")
        .delete()
        .eq("platform", platform);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      console.log(`Platform settings deleted for ${platform} by user ${user.id}`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `${platform} settings deleted` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in manage-social-platform-settings:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
