// shopify-oauth-start
// Validate shop domain, build authorize URL, return to FE for redirect.
// State = base64({ userId, brandTemplateId, organizationId, nonce, frontendOrigin }).
// Shopify returns hmac on callback so we don't need a server-side state table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { validateShopDomain } from "../_shared/shopify.ts";
import { decryptCredential } from "../_shared/crypto.ts";

async function getShopifyClientId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase
    .from('social_platform_settings')
    .select('consumer_key, is_active')
    .eq('platform', 'shopify')
    .maybeSingle();
  if (data?.consumer_key && data.is_active !== false) {
    try { return await decryptCredential(data.consumer_key); } catch (e) {
      console.error('[shopify-oauth-start] decrypt clientId failed:', e);
    }
  }
  return Deno.env.get('SHOPIFY_CLIENT_ID') || null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCOPES = ["read_content", "write_content", "read_products"].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "Thiếu Authorization token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { shopDomain, brandTemplateId, organizationId, frontendOrigin } = body as {
      shopDomain?: string; brandTemplateId?: string; organizationId?: string; frontendOrigin?: string;
    };

    const shop = validateShopDomain(shopDomain);
    if (!shop) {
      return json({ error: "Shop domain không hợp lệ. Định dạng đúng: yourstore.myshopify.com" }, 400);
    }

    const clientId = await getShopifyClientId(supabase);
    if (!clientId) return json({ error: "Shopify Client ID chưa cấu hình. Vào Admin → Social Settings → Shopify để nhập." }, 500);

    // Resolve org from brand if missing
    let resolvedOrgId = organizationId || null;
    if (!resolvedOrgId && brandTemplateId) {
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("id", brandTemplateId)
        .maybeSingle();
      resolvedOrgId = brand?.organization_id || null;
    }

    const nonceBytes = new Uint8Array(24);
    crypto.getRandomValues(nonceBytes);
    const nonce = btoa(String.fromCharCode(...nonceBytes))
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

    const stateObj = {
      userId: user.id,
      brandTemplateId: brandTemplateId || null,
      organizationId: resolvedOrgId,
      nonce,
      shop,
      frontendOrigin: frontendOrigin || null,
    };
    const state = btoa(JSON.stringify(stateObj));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/shopify-oauth-callback`;

    const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("scope", SCOPES);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    // Offline access (default) — long-lived token, no refresh needed.

    return json({ success: true, authorization_url: authorizeUrl.toString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shopify-oauth-start]", msg);
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
