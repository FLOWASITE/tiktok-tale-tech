// refresh-wix-token
// Refresh a Wix OAuth access token using the stored refresh_token.
// Internal: called by publish-website (when expired) AND by automated cron job.
//
// Refresh flow:
//   POST https://www.wixapis.com/oauth/access
//   { grant_type: 'refresh_token', client_id, client_secret, refresh_token }
//   → { access_token, refresh_token }
//
// Locking: to avoid concurrent refresh races (e.g. carousel posting 4 images
// in parallel), we use a compare-and-swap on metadata.refresh_lock_until
// — same pattern as Bluesky.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encrypt as encryptGCM, decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACCESS_TOKEN_TTL_SECONDS = 4 * 60;        // 4 min - Wix access token lives ~5 min
const REFRESH_LOCK_SECONDS = 30;                 // claim refresh slot for 30s

interface RefreshResult {
  accessToken: string;
  expiresAt: string;
}

async function getWixAppCreds(supabase: ReturnType<typeof createClient>): Promise<{ appId: string; appSecret: string }> {
  const { data } = await supabase
    .from("social_platform_settings")
    .select("consumer_key, consumer_secret, is_active")
    .eq("platform", "wix")
    .maybeSingle();
  let appId: string | null = null;
  let appSecret: string | null = null;
  if (data?.consumer_key && data?.consumer_secret && data.is_active !== false) {
    try {
      appId = await decryptCredential(data.consumer_key);
      appSecret = await decryptCredential(data.consumer_secret);
    } catch (e) {
      console.error("[refresh-wix-token] decrypt failed:", e);
    }
  }
  if (!appId) appId = Deno.env.get("WIX_APP_ID") || null;
  if (!appSecret) appSecret = Deno.env.get("WIX_APP_SECRET") || null;
  if (!appId || !appSecret) throw new Error("Wix App credentials chưa cấu hình");
  return { appId, appSecret };
}

export async function refreshWixConnection(connectionId: string): Promise<RefreshResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Load connection
  const { data: conn, error: connErr } = await supabase
    .from("social_connections")
    .select("id, refresh_token, access_token, token_expires_at, metadata")
    .eq("id", connectionId)
    .maybeSingle();
  if (connErr || !conn) throw new Error(`Wix connection ${connectionId} not found`);

  const meta = (conn.metadata || {}) as Record<string, unknown>;
  const lockUntilRaw = meta.refresh_lock_until as string | undefined;
  const lockUntil = lockUntilRaw ? new Date(lockUntilRaw).getTime() : 0;
  const now = Date.now();

  // 2. If another worker is refreshing, wait briefly then re-read
  if (lockUntil > now) {
    await new Promise((r) => setTimeout(r, 1500));
    const { data: refreshed } = await supabase
      .from("social_connections")
      .select("access_token, token_expires_at")
      .eq("id", connectionId)
      .maybeSingle();
    if (refreshed?.access_token && refreshed?.token_expires_at) {
      const at = await decryptCredential(refreshed.access_token);
      return { accessToken: at, expiresAt: refreshed.token_expires_at };
    }
  }

  // 3. Claim the refresh lock (compare-and-swap)
  const newLockUntil = new Date(now + REFRESH_LOCK_SECONDS * 1000).toISOString();
  const { data: claimed, error: claimErr } = await supabase
    .from("social_connections")
    .update({ metadata: { ...meta, refresh_lock_until: newLockUntil } })
    .eq("id", connectionId)
    .or(`metadata->>refresh_lock_until.is.null,metadata->>refresh_lock_until.lt.${new Date(now).toISOString()}`)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    // Lost the race — re-read latest token
    await new Promise((r) => setTimeout(r, 1500));
    const { data: refreshed } = await supabase
      .from("social_connections")
      .select("access_token, token_expires_at")
      .eq("id", connectionId)
      .maybeSingle();
    if (refreshed?.access_token && refreshed?.token_expires_at) {
      const at = await decryptCredential(refreshed.access_token);
      return { accessToken: at, expiresAt: refreshed.token_expires_at };
    }
    throw new Error("Could not claim refresh lock and no fresh token available");
  }

  try {
    // 4. Decrypt refresh_token + call Wix
    if (!conn.refresh_token) throw new Error("Connection has no refresh_token");
    const refreshTokenPlain = await decryptCredential(conn.refresh_token);
    const { appId, appSecret } = await getWixAppCreds(supabase);

    const resp = await fetch("https://www.wixapis.com/oauth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: appId,
        client_secret: appSecret,
        refresh_token: refreshTokenPlain,
      }),
    });
    if (!resp.ok) {
      const errText = (await resp.text()).slice(0, 300);
      // Mark connection as needing reauth
      await supabase
        .from("social_connections")
        .update({
          is_active: false,
          last_error: `Wix refresh failed [${resp.status}]: ${errText}`,
          metadata: { ...meta, refresh_lock_until: null, needs_reauth: true },
        })
        .eq("id", connectionId);
      throw new Error(`Wix refresh failed [${resp.status}]: ${errText}`);
    }

    const tokenJson = await resp.json() as { access_token: string; refresh_token?: string };
    const newAccess = tokenJson.access_token;
    const newRefresh = tokenJson.refresh_token || refreshTokenPlain;
    if (!newAccess) throw new Error("Wix did not return access_token on refresh");

    const encAccess = await encryptGCM(newAccess);
    const encRefresh = await encryptGCM(newRefresh);
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();

    await supabase
      .from("social_connections")
      .update({
        access_token: encAccess,
        refresh_token: encRefresh,
        token_expires_at: expiresAt,
        last_verified_at: new Date().toISOString(),
        last_error: null,
        is_active: true,
        metadata: { ...meta, refresh_lock_until: null, needs_reauth: false },
      })
      .eq("id", connectionId);

    return { accessToken: newAccess, expiresAt };
  } catch (e) {
    // Release lock on failure
    await supabase
      .from("social_connections")
      .update({ metadata: { ...meta, refresh_lock_until: null } })
      .eq("id", connectionId);
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Internal-only: require service role key
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!token || token !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized (service-role only)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const connectionId = (body as { connectionId?: string }).connectionId;
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await refreshWixConnection(connectionId);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[refresh-wix-token]", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
