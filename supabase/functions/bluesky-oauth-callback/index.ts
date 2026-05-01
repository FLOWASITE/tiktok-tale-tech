// supabase/functions/bluesky-oauth-callback/index.ts
//
// Exchange OAuth code for token, verify DID, fetch profile, persist connection.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  importDpopPrivateJwk,
  exchangeCodeForToken,
  pdsFetch,
  type AuthServerMetadata,
} from "../_shared/bluesky-oauth.ts";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { code, state, iss } = body as { code?: string; state?: string; iss?: string };
    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Thiếu code hoặc state" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Lookup pending state
    const { data: pending, error: pErr } = await supabase
      .from("oauth_pending_states")
      .select("*")
      .eq("state", state)
      .eq("user_id", user.id)
      .maybeSingle();

    if (pErr || !pending) {
      return new Response(JSON.stringify({ error: "Phiên OAuth không hợp lệ hoặc đã hết hạn" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await supabase.from("oauth_pending_states").delete().eq("state", state);
      return new Response(JSON.stringify({ error: "Phiên OAuth đã hết hạn, vui lòng kết nối lại" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (iss && iss !== pending.authz_issuer) {
      return new Response(JSON.stringify({ error: "Issuer không khớp — có thể là tấn công" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Restore DPoP key
    const dpopKey = await importDpopPrivateJwk(pending.dpop_private_jwk);

    const authServer: AuthServerMetadata = {
      issuer: pending.authz_issuer,
      authorization_endpoint: pending.authorization_endpoint || "",
      token_endpoint: pending.token_endpoint,
      pushed_authorization_request_endpoint: pending.par_endpoint || "",
    };

    // 3. Exchange code for token
    const tokenSet = await exchangeCodeForToken({
      authServer, code, pkceVerifier: pending.pkce_verifier, dpopKey,
      initialNonce: pending.dpop_nonce || undefined,
    });

    if (pending.did && tokenSet.sub !== pending.did) {
      return new Response(JSON.stringify({ error: "DID không khớp với handle ban đầu" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Fetch profile (best-effort)
    let profile: any = {};
    try {
      const { response } = await pdsFetch({
        url: `${pending.pds_url}/xrpc/app.bsky.actor.getProfile?actor=${tokenSet.sub}`,
        method: "GET",
        accessToken: tokenSet.access_token,
        dpopKey,
        nonce: tokenSet.dpop_nonce,
      });
      if (response.ok) profile = await response.json();
    } catch (e) { console.warn("[bluesky-oauth-callback] profile fetch failed:", e); }

    // 5. Encrypt sensitive fields
    const encAccess = await encrypt(tokenSet.access_token);
    const encRefresh = await encrypt(tokenSet.refresh_token);
    const encDpopJwk = await encrypt(JSON.stringify(pending.dpop_private_jwk));

    // 6. Upsert connection (one per brand+platform OR one per org+platform)
    let query = supabase.from("social_connections").select("id").eq("platform", "bluesky");
    if (pending.brand_template_id) query = query.eq("brand_template_id", pending.brand_template_id);
    else query = query.eq("organization_id", pending.organization_id);
    const { data: existing } = await query.maybeSingle();

    const handleFinal = profile.handle || pending.handle || tokenSet.sub;

    const connectionData = {
      organization_id: pending.organization_id,
      brand_template_id: pending.brand_template_id || null,
      user_id: user.id,
      platform: "bluesky",
      platform_user_id: tokenSet.sub,
      platform_username: handleFinal,
      platform_display_name: profile.displayName || handleFinal,
      platform_avatar_url: profile.avatar || null,
      access_token: encAccess,
      refresh_token: encRefresh,
      token_expires_at: new Date(tokenSet.expires_at).toISOString(),
      is_active: true,
      connected_at: new Date().toISOString(),
      last_error: null,
      scopes: (tokenSet.scope || "atproto transition:generic").split(/\s+/),
      metadata: {
        did: tokenSet.sub,
        pds_url: pending.pds_url,
        authz_issuer: pending.authz_issuer,
        token_endpoint: pending.token_endpoint,
        dpop_jwk_encrypted: encDpopJwk,
        dpop_nonce: tokenSet.dpop_nonce || null,
        token_type: tokenSet.token_type,
        oauth_version: 2,
      },
    };

    let connection;
    if (existing) {
      const { data, error: uErr } = await supabase
        .from("social_connections").update(connectionData)
        .eq("id", existing.id).select().single();
      if (uErr) throw uErr;
      connection = data;
    } else {
      const { data, error: iErr } = await supabase
        .from("social_connections").insert(connectionData).select().single();
      if (iErr) throw iErr;
      connection = data;
    }

    // 7. Cleanup pending state
    await supabase.from("oauth_pending_states").delete().eq("state", state);

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id, platform: "bluesky",
          username: handleFinal, displayName: profile.displayName, isActive: true,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[bluesky-oauth-callback]", e);
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
