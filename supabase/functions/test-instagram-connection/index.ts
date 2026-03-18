import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Call Instagram Graph API to verify token
    const instagramUserId = connection.platform_user_id;
    const apiUrl = `https://graph.instagram.com/v21.0/${instagramUserId}?fields=id,username,account_type,media_count&access_token=${accessToken}`;

    console.log("Testing Instagram connection for user:", instagramUserId);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("Instagram API error:", data);
      
      // Check if token is invalid
      if (data.error?.code === 190 || data.error?.type === "OAuthException") {
        // Mark connection as inactive
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
            error: data.error?.message || "Invalid or expired token",
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
});
