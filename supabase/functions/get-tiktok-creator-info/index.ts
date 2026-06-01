import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential, encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  connectionId: string;
}

Deno.serve(withPerf({ functionName: "get-tiktok-creator-info" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();
    const { connectionId } = (await req.json()) as ReqBody;

    if (!connectionId || typeof connectionId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "connectionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate caller (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: connection, error: connErr } = await supabase
      .from("social_connections")
      .select("id, platform, access_token, refresh_token, organization_id, user_id, token_expires_at, metadata")
      .eq("id", connectionId)
      .single();

    if (connErr || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: "TikTok connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (connection.platform !== "tiktok") {
      return new Response(
        JSON.stringify({ success: false, error: "Connection is not TikTok" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify caller: owner of connection, OR member of connection.organization_id (if set)
    let authorized = (connection as any).user_id === user.id;
    if (!authorized && connection.organization_id) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("organization_id", connection.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();
      authorized = Boolean(membership);
    }
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callTikTok = async (token: string) =>
      fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: "{}",
      });

    const refreshAndGetToken = async (): Promise<string | null> => {
      try {
        if (!connection.refresh_token) {
          await supabase
            .from("social_connections")
            .update({
              is_active: false,
              metadata: {
                ...((connection as any).metadata || {}),
                needs_reauth: true,
                reauth_reason: "missing_refresh_token",
              },
            })
            .eq("id", connectionId);
          return null;
        }

        const { data: settings, error: settingsError } = await supabase
          .from("social_platform_settings")
          .select("consumer_key, consumer_secret")
          .eq("platform", "tiktok")
          .eq("is_active", true)
          .single();

        if (settingsError || !settings?.consumer_key || !settings?.consumer_secret) {
          console.error("[get-tiktok-creator-info] TikTok platform settings not found", settingsError);
          return null;
        }

        const [clientKey, clientSecret, refreshToken] = await Promise.all([
          decryptCredential(settings.consumer_key),
          decryptCredential(settings.consumer_secret),
          decryptCredential(connection.refresh_token),
        ]);

        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }).toString(),
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));

        if (!tokenResponse.ok || !tokenData.access_token) {
          const refreshError = tokenData.error_description || tokenData.message || tokenData.error || "Failed to refresh TikTok token";
          console.error("[get-tiktok-creator-info] refresh failed", tokenResponse.status, tokenData);
          await supabase
            .from("social_connections")
            .update({
              is_active: false,
              metadata: {
                ...((connection as any).metadata || {}),
                needs_reauth: true,
                reauth_reason: "refresh_failed",
                refresh_error: refreshError,
              },
            })
            .eq("id", connectionId);
          return null;
        }

        const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();
        const encryptedAccessToken = await encrypt(tokenData.access_token);
        const encryptedRefreshToken = tokenData.refresh_token
          ? await encrypt(tokenData.refresh_token)
          : connection.refresh_token;

        const { error: updateError } = await supabase
          .from("social_connections")
          .update({
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            token_expires_at: tokenExpiresAt,
            is_active: true,
            metadata: {
              ...((connection as any).metadata || {}),
              last_refreshed: new Date().toISOString(),
              needs_reauth: false,
              reauth_reason: null,
              refresh_error: null,
            },
          })
          .eq("id", connectionId);

        if (updateError) {
          console.error("[get-tiktok-creator-info] token update failed", updateError);
          return null;
        }

        console.log("[get-tiktok-creator-info] token refreshed successfully");
        return tokenData.access_token;
      } catch (e) {
        console.error("[get-tiktok-creator-info] refresh exception", e);
        return null;
      }
    };

    let accessToken = connection.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "TikTok access token missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    accessToken = await decryptCredential(accessToken);

    // Proactive refresh if token expired or near expiry (< 5 min)
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
    if (expiresAt && expiresAt - Date.now() < 5 * 60 * 1000) {
      const newToken = await refreshAndGetToken();
      if (newToken) accessToken = newToken;
    }

    let response = await callTikTok(accessToken);
    let result: any = await response.json().catch(() => ({}));

    // Reactive refresh on 401 / invalid token
    if (response.status === 401 || result?.error?.code === "access_token_invalid") {
      const newToken = await refreshAndGetToken();
      if (newToken) {
        accessToken = newToken;
        response = await callTikTok(accessToken);
        result = await response.json().catch(() => ({}));
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "TikTok token is invalid. Please reconnect your TikTok account.",
            errorCode: "needs_reauth",
            needsReauth: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
    if (!response.ok || (result?.error?.code && result.error.code !== "ok")) {
      console.error("[get-tiktok-creator-info] error", response.status, result);
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error?.message || `TikTok API ${response.status}`,
          errorCode: result?.error?.code || "TIKTOK_API_ERROR",
        }),
        { status: response.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const d = result?.data ?? {};
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          privacyLevelOptions: Array.isArray(d.privacy_level_options) ? d.privacy_level_options : [],
          commentDisabled: Boolean(d.comment_disabled),
          duetDisabled: Boolean(d.duet_disabled),
          stitchDisabled: Boolean(d.stitch_disabled),
          maxVideoPostDurationSec: typeof d.max_video_post_duration_sec === "number"
            ? d.max_video_post_duration_sec
            : null,
          creatorAvatarUrl: d.creator_avatar_url || null,
          creatorNickname: d.creator_nickname || null,
          creatorUsername: d.creator_username || null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[get-tiktok-creator-info] exception", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}));
