// supabase/functions/refresh-bluesky-token/index.ts
//
// Refresh Bluesky OAuth access tokens for connections nearing expiry.
// Called by pg_cron and on-demand by publish-bluesky.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  importDpopPrivateJwk,
  refreshAccessToken,
  type AuthServerMetadata,
} from "../_shared/bluesky-oauth.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshOne(supabase: any, connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: conn, error } = await supabase
    .from("social_connections").select("*").eq("id", connectionId).eq("platform", "bluesky").single();
  if (error || !conn) return { ok: false, error: "Connection not found" };

  const meta = conn.metadata || {};
  if (!meta.token_endpoint || !meta.dpop_jwk_encrypted) {
    return { ok: false, error: "Connection missing OAuth metadata (legacy App Password?)" };
  }

  const previousLock = meta.refresh_lock_until || null;
  const lockExpired = !previousLock || new Date(previousLock).getTime() < Date.now();
  if (!lockExpired) return { ok: false, error: "Refresh already in progress" };

  const lockUntil = new Date(Date.now() + 15_000).toISOString();
  const { data: claimRow, error: claimErr } = await supabase
    .from("social_connections")
    .update({ metadata: { ...meta, refresh_lock_until: lockUntil } })
    .eq("id", connectionId)
    .eq("updated_at", conn.updated_at)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimRow) return { ok: false, error: "Refresh lock claim failed" };

  const refreshTokenPlain = await decrypt(conn.refresh_token);
  const dpopJwkPlain = await decrypt(meta.dpop_jwk_encrypted);
  const dpopJwk = JSON.parse(dpopJwkPlain);
  const dpopKey = await importDpopPrivateJwk(dpopJwk);

  const authServer: AuthServerMetadata = {
    issuer: meta.authz_issuer,
    authorization_endpoint: "",
    token_endpoint: meta.token_endpoint,
    pushed_authorization_request_endpoint: "",
  };

  try {
    const newToken = await refreshAccessToken({
      authServer,
      refreshToken: refreshTokenPlain,
      dpopKey,
      initialNonce: meta.dpop_nonce || undefined,
    });

    await supabase.from("social_connections").update({
      access_token: await encrypt(newToken.access_token),
      refresh_token: await encrypt(newToken.refresh_token),
      token_expires_at: new Date(newToken.expires_at).toISOString(),
      last_error: null,
      metadata: { ...meta, dpop_nonce: newToken.dpop_nonce || meta.dpop_nonce, refresh_lock_until: null },
    }).eq("id", connectionId);

    return { ok: true };
  } catch (e: any) {
    const msg = e?.message || String(e);
    const reauthRequired = /invalid_grant|refresh token replayed|invalid refresh token/i.test(msg);
    await supabase.from("social_connections").update({
      ...(reauthRequired ? { is_active: false } : {}),
      last_error: reauthRequired
        ? "Phiên Bluesky đã hết hạn hoặc refresh token đã bị dùng lại. Vui lòng kết nối lại Bluesky."
        : `Refresh failed: ${msg}`,
      metadata: { ...meta, refresh_lock_until: null },
    }).eq("id", connectionId);
    return { ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId } = body as { connectionId?: string };

    // On-demand single refresh
    if (connectionId) {
      const r = await refreshOne(supabase, connectionId);
      return new Response(JSON.stringify(r), {
        status: r.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk: refresh all bluesky connections expiring within 30 min
    const cutoff = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: conns } = await supabase
      .from("social_connections")
      .select("id")
      .eq("platform", "bluesky")
      .eq("is_active", true)
      .lt("token_expires_at", cutoff);

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const c of conns || []) {
      const r = await refreshOne(supabase, c.id);
      results.push({ id: c.id, ...r });
    }
    return new Response(JSON.stringify({ refreshed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[refresh-bluesky-token]", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
