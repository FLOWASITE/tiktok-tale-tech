// shopify-app-uninstalled-webhook
// Public endpoint. Verifies HMAC, soft-deletes the connection for the uninstalling shop.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyWebhookHmac, validateShopDomain } from "../_shared/shopify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!clientSecret) throw new Error("SHOPIFY_CLIENT_SECRET not configured");

    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";
    const shopHeader = validateShopDomain(req.headers.get("x-shopify-shop-domain"));
    const topic = req.headers.get("x-shopify-topic") || "";

    const rawBody = new Uint8Array(await req.arrayBuffer());

    const valid = await verifyWebhookHmac(rawBody, hmacHeader, clientSecret);
    if (!valid) {
      console.warn("[shopify-uninstall-webhook] HMAC failed", { shop: shopHeader, topic });
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    if (topic !== "app/uninstalled" || !shopHeader) {
      // Acknowledge so Shopify doesn't retry, but log for visibility.
      console.warn("[shopify-uninstall-webhook] Unexpected topic or shop", { topic, shopHeader });
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("social_connections")
      .update({
        is_active: false,
        last_error: "App uninstalled by merchant",
        updated_at: new Date().toISOString(),
      })
      .eq("platform", "shopify")
      .eq("platform_user_id", shopHeader);

    if (error) console.error("[shopify-uninstall-webhook] DB update error:", error);

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[shopify-uninstall-webhook] error:", e);
    // Always return 200 to avoid Shopify webhook retry storms once we've received it.
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
