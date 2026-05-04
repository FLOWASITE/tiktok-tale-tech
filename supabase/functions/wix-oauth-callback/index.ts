// wix-oauth-callback
// Public endpoint (verify_jwt=false). Wix sends ?code=&instanceId=&state= after install.
// Exchange code → access_token + refresh_token, then fetch site/instance info,
// encrypt and upsert into social_connections (platform='website',
// metadata.integration_type='wix_oauth').
//
// Wix OAuth docs:
// - Install flow: https://dev.wix.com/docs/build-apps/develop-your-app/access/authorization/oauth-installation-flow
// - Token exchange: POST https://www.wixapis.com/oauth/access
//   { grant_type: 'authorization_code', client_id, client_secret, code }
//   → { access_token, refresh_token, instance_id }
// - Access tokens expire in ~5 min, refresh tokens are long-lived.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wix access tokens TTL ~ 5 minutes. We'll mark expiry conservatively.
const ACCESS_TOKEN_TTL_SECONDS = 4 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.flowa.one";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const instanceIdParam = url.searchParams.get("instanceId");
    const oauthError = url.searchParams.get("error");

    if (oauthError) throw new Error(`OAuth error: ${oauthError}`);
    if (!code || !stateRaw) throw new Error("Missing required OAuth parameters");

    // Read Wix App credentials from social_platform_settings (admin form),
    // fallback to legacy env secrets.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let appId: string | null = null;
    let appSecret: string | null = null;
    const { data: spSettings } = await supabase
      .from("social_platform_settings")
      .select("consumer_key, consumer_secret, is_active")
      .eq("platform", "wix")
      .maybeSingle();
    if (spSettings?.consumer_key && spSettings?.consumer_secret && spSettings.is_active !== false) {
      try {
        appId = await decryptCredential(spSettings.consumer_key);
        appSecret = await decryptCredential(spSettings.consumer_secret);
      } catch (e) {
        console.error("[wix-oauth-callback] decrypt failed:", e);
      }
    }
    if (!appId) appId = Deno.env.get("WIX_APP_ID") || null;
    if (!appSecret) appSecret = Deno.env.get("WIX_APP_SECRET") || null;
    if (!appId || !appSecret) {
      throw new Error("Wix App credentials chưa cấu hình (Admin → Social Settings → Wix)");
    }

    // Decode state
    let stateData: {
      userId: string;
      brandTemplateId: string | null;
      organizationId: string | null;
      nonce: string;
      frontendOrigin?: string | null;
    };
    try {
      stateData = JSON.parse(atob(stateRaw));
    } catch {
      throw new Error("Invalid state parameter");
    }
    if (stateData.frontendOrigin) frontendUrl = stateData.frontendOrigin;

    // Exchange code → tokens
    const tokenRes = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: appId,
        client_secret: appSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Wix token exchange failed: ${tokenRes.status} ${(await tokenRes.text()).slice(0, 300)}`);
    }
    const tokenJson = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      instance_id?: string;
    };

    const accessToken = tokenJson.access_token;
    const refreshToken = tokenJson.refresh_token;
    const instanceId = tokenJson.instance_id || instanceIdParam || null;

    if (!accessToken || !refreshToken) {
      throw new Error("Wix did not return access_token/refresh_token");
    }

    // Fetch instance/site info (best-effort)
    let siteId: string | null = null;
    let siteUrl: string | null = null;
    let siteName: string | null = null;
    try {
      const instResp = await fetch("https://www.wixapis.com/apps/v1/instance", {
        headers: { Authorization: accessToken },
      });
      if (instResp.ok) {
        const inst = await instResp.json() as any;
        siteId = inst?.site?.siteDisplayName ? (inst?.site?.siteId || null) : (inst?.instance?.siteId || null);
        siteUrl = inst?.site?.url || inst?.instance?.appName || null;
        siteName = inst?.site?.siteDisplayName || inst?.instance?.appName || null;
      }
    } catch (e) {
      console.warn("[wix-oauth-callback] instance fetch failed:", e);
    }

    // Resolve org from brand if missing
    let organizationId = stateData.organizationId;
    if (!organizationId && stateData.brandTemplateId) {
      const { data: bt } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("id", stateData.brandTemplateId)
        .maybeSingle();
      organizationId = bt?.organization_id || null;
    }

    // Encrypt tokens
    const encryptedAccess = await encryptGCM(accessToken);
    const encryptedRefresh = await encryptGCM(refreshToken);

    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();

    const websiteUrl = siteUrl || (siteId ? `wix://${siteId}` : "wix://unknown");
    const platformUserId = instanceId || siteId || crypto.randomUUID();

    const metadata = {
      website_url: websiteUrl,
      integration_type: "wix_oauth",
      wix_instance_id: instanceId,
      wix_site_id: siteId,
      wix_app_id: appId,
      site_name: siteName,
      can_auto_publish: true,
    };

    // Upsert: one row per (brand, instance)
    let query = supabase
      .from("social_connections")
      .select("id")
      .eq("platform", "website")
      .eq("platform_user_id", platformUserId);
    if (stateData.brandTemplateId) query = query.eq("brand_template_id", stateData.brandTemplateId);
    else if (organizationId) query = query.eq("organization_id", organizationId);
    const { data: existing } = await query.maybeSingle();

    const row = {
      user_id: stateData.userId,
      organization_id: organizationId,
      brand_template_id: stateData.brandTemplateId,
      platform: "website",
      platform_user_id: platformUserId,
      platform_username: siteName || websiteUrl,
      platform_display_name: siteName || websiteUrl,
      platform_avatar_url: null,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      scopes: ["BLOG.MANAGE-POSTS", "BLOG.MANAGE-DRAFT-POSTS", "MEDIA.MANAGE-MEDIA"],
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

    // Redirect back to Flowa
    const target = new URL("/auth/wix/callback", frontendUrl);
    target.searchParams.set("status", "success");
    if (siteName) target.searchParams.set("site", siteName);
    if (stateData.brandTemplateId) target.searchParams.set("brandTemplateId", stateData.brandTemplateId);
    return Response.redirect(target.toString(), 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[wix-oauth-callback]", msg);
    const target = new URL("/auth/wix/callback", frontendUrl);
    target.searchParams.set("status", "error");
    target.searchParams.set("message", msg.slice(0, 200));
    return Response.redirect(target.toString(), 302);
  }
});
