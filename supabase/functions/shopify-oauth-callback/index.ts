// shopify-oauth-callback
// Public endpoint (verify_jwt=false). Verifies HMAC, exchanges code → access token,
// encrypts and upserts social_connections, registers app/uninstalled webhook,
// then redirects user back to Flowa frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";
import {
  validateShopDomain,
  verifyOAuthHmac,
  getShopInfo,
  listBlogs,
  registerUninstallWebhook,
} from "../_shared/shopify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.flowa.one";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const shopParam = url.searchParams.get("shop");
    const oauthError = url.searchParams.get("error");

    if (oauthError) throw new Error(`OAuth error: ${oauthError}`);
    if (!code || !stateRaw || !shopParam) {
      throw new Error("Missing required OAuth parameters");
    }

    const shop = validateShopDomain(shopParam);
    if (!shop) throw new Error("Invalid shop domain in callback");

    const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("Shopify credentials not configured");

    // 1. Verify HMAC
    const hmacOk = await verifyOAuthHmac(url, clientSecret);
    if (!hmacOk) throw new Error("HMAC verification failed");

    // 2. Decode state
    let stateData: {
      userId: string;
      brandTemplateId: string | null;
      organizationId: string | null;
      nonce: string;
      shop: string;
      frontendOrigin?: string | null;
    };
    try {
      stateData = JSON.parse(atob(stateRaw));
    } catch {
      throw new Error("Invalid state parameter");
    }
    if (stateData.shop !== shop) throw new Error("State shop mismatch");
    if (stateData.frontendOrigin) frontendUrl = stateData.frontendOrigin;

    // 3. Exchange code → access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    const tokenJson = await tokenRes.json() as { access_token: string; scope: string };
    const accessToken = tokenJson.access_token;
    const grantedScopes = (tokenJson.scope || "").split(",").map((s) => s.trim()).filter(Boolean);

    // 4. Resolve org from brand if missing
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let organizationId = stateData.organizationId;
    if (!organizationId && stateData.brandTemplateId) {
      const { data: bt } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("id", stateData.brandTemplateId)
        .maybeSingle();
      organizationId = bt?.organization_id || null;
    }

    // 5. Fetch shop info + default blog (best-effort)
    const shopInfo = await getShopInfo(shop, accessToken).catch(() => null);
    const blogs = await listBlogs(shop, accessToken).catch(() => [] as Array<{ id: number; title: string; handle: string }>);
    const defaultBlog = blogs[0] || null;

    // 6. Encrypt token
    const encryptedToken = await encryptGCM(accessToken);

    // 7. Upsert social_connections (one row per shop per brand)
    const metadata = {
      shop_domain: shop,
      shop_name: shopInfo?.name || null,
      shop_email: shopInfo?.email || null,
      shop_locale: shopInfo?.primary_locale || null,
      primary_domain: shopInfo?.domain || null,
      granted_scope: tokenJson.scope || "",
      default_blog_id: defaultBlog?.id || null,
      default_blog_title: defaultBlog?.title || null,
      default_blog_handle: defaultBlog?.handle || null,
      blogs_count: blogs.length,
    };

    // Find existing connection
    const { data: existing } = await supabase
      .from("social_connections")
      .select("id")
      .eq("platform", "shopify")
      .eq("user_id", stateData.userId)
      .eq("brand_template_id", stateData.brandTemplateId || null as unknown as string)
      .eq("platform_user_id", shop)
      .maybeSingle();

    const row = {
      user_id: stateData.userId,
      organization_id: organizationId,
      brand_template_id: stateData.brandTemplateId,
      platform: "shopify",
      platform_user_id: shop,
      platform_username: shop,
      platform_display_name: shopInfo?.name || shop,
      platform_avatar_url: null,
      access_token: encryptedToken,
      refresh_token: null,
      token_expires_at: null, // Shopify offline tokens never expire
      scopes: grantedScopes,
      is_active: true,
      connected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      last_error: null,
      metadata,
      connection_type: "social",
    };

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("social_connections")
        .update(row)
        .eq("id", existing.id);
      if (updErr) throw new Error(`DB update failed: ${updErr.message}`);
    } else {
      const { error: insErr } = await supabase
        .from("social_connections")
        .insert(row);
      if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);
    }

    // 8. Subscribe to app/uninstalled webhook (non-blocking)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    await registerUninstallWebhook(
      shop,
      accessToken,
      `${supabaseUrl}/functions/v1/shopify-app-uninstalled-webhook`,
    );

    // 9. Redirect back to Flowa
    const target = new URL("/auth/shopify/callback", frontendUrl);
    target.searchParams.set("status", "success");
    target.searchParams.set("shop", shop);
    if (stateData.brandTemplateId) target.searchParams.set("brandTemplateId", stateData.brandTemplateId);
    return Response.redirect(target.toString(), 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shopify-oauth-callback]", msg);
    const target = new URL("/auth/shopify/callback", frontendUrl);
    target.searchParams.set("status", "error");
    target.searchParams.set("message", msg.slice(0, 200));
    return Response.redirect(target.toString(), 302);
  }
});
