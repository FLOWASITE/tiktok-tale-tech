import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

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
      .select("id, platform, access_token, organization_id, token_expires_at, metadata")
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

    let accessToken = connection.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "TikTok access token missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    accessToken = await decryptCredential(accessToken);

    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: "{}",
      },
    );

    const result = await response.json().catch(() => ({}));
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
