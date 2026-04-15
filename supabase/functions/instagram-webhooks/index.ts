import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseSignedRequest(signedRequest: string, appSecret: string): Record<string, unknown> | null {
  try {
    const [encodedSig, payload] = signedRequest.split(".");
    if (!encodedSig || !payload) return null;

    // Decode payload
    const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

    // Verify signature
    const expectedSig = createHmac("sha256", appSecret)
      .update(payload)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const decodedSig = encodedSig.replace(/=+$/, "");
    if (decodedSig !== expectedSig) {
      console.warn("[instagram-webhooks] Signature mismatch");
      return null;
    }

    return data;
  } catch (e) {
    console.error("[instagram-webhooks] parseSignedRequest error:", e);
    return null;
  }
}

async function getAppSecret(): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data } = await supabase
      .from("social_platform_settings")
      .select("consumer_secret")
      .eq("platform", "instagram")
      .maybeSingle();

    if (!data?.consumer_secret) return null;

    // Decrypt
    const { decrypt } = await import("../_shared/crypto.ts");
    return await decrypt(data.consumer_secret);
  } catch (e) {
    console.error("[instagram-webhooks] Failed to get app secret:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (!type || !["deauthorize", "data-deletion"].includes(type)) {
    return new Response(JSON.stringify({ error: "Invalid type parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse form data (Meta sends as application/x-www-form-urlencoded)
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      return new Response(JSON.stringify({ error: "Missing signed_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appSecret = await getAppSecret();
    if (!appSecret) {
      console.error("[instagram-webhooks] No app secret configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = parseSignedRequest(signedRequest, appSecret);
    if (!data) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.user_id as string;
    console.log(`[instagram-webhooks] type=${type}, user_id=${userId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (type === "deauthorize") {
      // Deactivate all Instagram connections for this platform user
      const { error } = await supabase
        .from("social_connections")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("platform", "instagram")
        .eq("platform_user_id", userId);

      if (error) console.error("[instagram-webhooks] deauthorize DB error:", error);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "data-deletion") {
      // Delete Instagram connections for this platform user
      const { error } = await supabase
        .from("social_connections")
        .delete()
        .eq("platform", "instagram")
        .eq("platform_user_id", userId);

      if (error) console.error("[instagram-webhooks] data-deletion DB error:", error);

      const confirmationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      const siteUrl = Deno.env.get("SITE_URL") || "https://app.flowa.one";

      return new Response(
        JSON.stringify({
          url: `${siteUrl}/data-deletion?code=${confirmationCode}`,
          confirmation_code: confirmationCode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[instagram-webhooks] Error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
