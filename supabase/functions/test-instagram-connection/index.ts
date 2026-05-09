import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withPerf({ functionName: 'test-instagram-connection' }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: "connectionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = getServiceClient();

    // Fetch the connection
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("platform", "instagram")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: "Instagram connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!connection.access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "No access token found for this connection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the access token
    let accessToken: string;
    try {
      accessToken = await decryptCredential(connection.access_token);
    } catch (decryptError) {
      console.error("Failed to decrypt access token:", decryptError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to decrypt access token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token expiry
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
    const now = new Date();
    const isExpired = tokenExpiresAt && tokenExpiresAt < now;
    const expiresInDays = tokenExpiresAt 
      ? Math.ceil((tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (isExpired) {
      // Mark connection as inactive
      await supabase
        .from("social_connections")
        .update({ 
          is_active: false,
          metadata: {
            ...connection.metadata,
            last_test: now.toISOString(),
            test_result: "expired",
          }
        })
        .eq("id", connectionId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token has expired",
          expired: true,
          expired_at: tokenExpiresAt?.toISOString(),
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Instagram Graph API to verify token.
    // Strategy (Dev Mode resilient):
    //  1. /me?fields=id,username (minimal — works in App Dev Mode)
    //  2. retry once after 1.5s if code 2 + is_transient
    //  3. fallback: /{platform_user_id}?fields=id (token alive but limited)
    const instagramUserId = connection.platform_user_id;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const callIg = async (path: string) => {
      const url = `https://graph.instagram.com/v21.0/${path}${path.includes('?') ? '&' : '?'}access_token=${accessToken}`;
      const r = await fetch(url);
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, body: j };
    };

    console.log("Testing Instagram connection for user:", instagramUserId);

    // Primary call
    let primary = await callIg('me?fields=id,username');
    const isTransient = (b: any) => b?.error?.is_transient || b?.error?.code === 2;

    if (!primary.ok && isTransient(primary.body)) {
      console.log('[ig-test] transient code 2, retrying after 1500ms');
      await sleep(1500);
      primary = await callIg('me?fields=id,username');
    }

    let data: any;
    let limited = false;
    let limitedHint: string | null = null;

    if (primary.ok) {
      data = primary.body;
      // Best-effort enrichment (account_type, media_count) — failure is non-fatal
      const enrich = await callIg(`me?fields=account_type,media_count`);
      if (enrich.ok) {
        data.account_type = enrich.body?.account_type;
        data.media_count = enrich.body?.media_count;
      } else {
        console.log('[ig-test] enrich failed (non-fatal):', enrich.body?.error?.message);
      }
    } else if (isTransient(primary.body)) {
      // Try id-only against numeric user id (sometimes works when /me flakes)
      const idOnly = await callIg(`${instagramUserId}?fields=id`);
      if (idOnly.ok) {
        data = { id: idOnly.body?.id, username: connection.platform_username };
        limited = true;
        limitedHint = 'Meta App đang ở Development Mode hoặc IG account chưa có Tester role. Token vẫn sống nhưng một số field bị giới hạn. Vào Meta Developer Console → Roles → Add Instagram Tester, hoặc submit App Review để vào Live Mode.';
        console.log('[ig-test] primary failed transient, id-only fallback OK');
      }
    }

    const response = { ok: !!data, status: primary.status } as { ok: boolean; status: number };
    if (!data) data = primary.body;

    if (!response.ok) {
      console.error("Instagram API error:", data);

      // Transient errors (code 2, is_transient: true) — do NOT invalidate token
      if (data.error?.is_transient || data.error?.code === 2) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Instagram đang gặp sự cố tạm thời. Vui lòng thử lại sau 1-2 phút.",
            transient: true,
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Token truly invalid (code 190) — mark inactive
      if (data.error?.code === 190) {
        await supabase
          .from("social_connections")
          .update({ 
            is_active: false,
            metadata: {
              ...connection.metadata,
              last_test: now.toISOString(),
              test_result: "invalid_token",
              error: data.error?.message,
            }
          })
          .eq("id", connectionId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.error?.message || "Token không hợp lệ hoặc đã hết hạn",
            token_invalid: true,
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error?.message || "Failed to verify Instagram connection",
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update connection with latest info and mark as verified
    await supabase
      .from("social_connections")
      .update({
        is_active: true,
        platform_username: data.username || connection.platform_username,
        metadata: {
          ...connection.metadata,
          last_test: now.toISOString(),
          test_result: "success",
          account_type: data.account_type,
          media_count: data.media_count,
        }
      })
      .eq("id", connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instagram connection is valid",
        data: {
          instagram_user_id: data.id,
          username: data.username,
          account_type: data.account_type,
          media_count: data.media_count,
          token_expires_in_days: expiresInDays,
          needs_refresh: expiresInDays !== null && expiresInDays <= 7,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error testing Instagram connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
