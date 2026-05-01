// supabase/functions/bluesky-oauth-start/index.ts
//
// Resolve handle → PDS → discover authz server → PAR → return authorization URL.
// Stores PKCE verifier + per-session DPoP key in `oauth_pending_states`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  resolveHandle,
  discoverAuthServer,
  generatePKCE,
  generateDpopKey,
  exportDpopPrivateJwk,
  pushAuthorizationRequest,
  buildAuthorizationUrl,
} from "../_shared/bluesky-oauth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomState(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Thiếu Authorization token" }), {
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
    const { handle: handleRaw, brandTemplateId, organizationId } = body as {
      handle?: string; brandTemplateId?: string; organizationId?: string;
    };

    const handle = (handleRaw || "").trim().replace(/^@/, "").toLowerCase();

    if (!handle) {
      return new Response(JSON.stringify({ error: "Vui lòng nhập handle Bluesky (vd: yourname.bsky.social)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-validate handle: ASCII only, no spaces, must contain a dot, valid label chars
    const HANDLE_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (handle.length > 253 || !HANDLE_RE.test(handle)) {
      return new Response(
        JSON.stringify({
          error: `Handle "${handleRaw}" không hợp lệ. Hãy nhập đúng handle như trên Bluesky, vd: yourname.bsky.social (không có dấu cách, không dấu tiếng Việt, không phải tên hiển thị).`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Resolve identity (return 400 on failure, not 500)
    let identity;
    try {
      identity = await resolveHandle(handle);
    } catch (resolveErr: any) {
      return new Response(
        JSON.stringify({ error: resolveErr?.message || `Không tìm thấy handle "${handle}" trên Bluesky.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Discover auth server
    const authServer = await discoverAuthServer(identity.pdsUrl);

    // 3. PKCE + DPoP key
    const pkce = await generatePKCE();
    const dpopKey = await generateDpopKey();
    const dpopJwk = await exportDpopPrivateJwk(dpopKey.privateKey);

    // 4. Resolve org from brand if needed
    let resolvedOrgId = organizationId || null;
    if (!resolvedOrgId && brandTemplateId) {
      const { data: brand } = await supabase
        .from("brand_templates").select("organization_id")
        .eq("id", brandTemplateId).maybeSingle();
      resolvedOrgId = brand?.organization_id || null;
    }

    // 5. PAR
    const state = randomState();
    const par = await pushAuthorizationRequest({
      authServer, pkce, state,
      loginHint: identity.handle,
      dpopKey,
    });

    // 6. Persist pending state
    const { error: insErr } = await supabase.from("oauth_pending_states").insert({
      state,
      user_id: user.id,
      platform: "bluesky",
      brand_template_id: brandTemplateId || null,
      organization_id: resolvedOrgId,
      pkce_verifier: pkce.verifier,
      dpop_private_jwk: dpopJwk,
      pds_url: identity.pdsUrl,
      authz_issuer: authServer.issuer,
      token_endpoint: authServer.token_endpoint,
      par_endpoint: authServer.pushed_authorization_request_endpoint,
      authorization_endpoint: authServer.authorization_endpoint,
      handle: identity.handle,
      did: identity.did,
      dpop_nonce: par.dpop_nonce || null,
    });
    if (insErr) throw insErr;

    const authorization_url = buildAuthorizationUrl(authServer, par.request_uri);

    return new Response(
      JSON.stringify({ success: true, authorization_url, state }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[bluesky-oauth-start]", e);
    return new Response(
      JSON.stringify({ error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
