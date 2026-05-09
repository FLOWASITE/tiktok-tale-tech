// Pinterest Sandbox connection: user pastes a manually-generated access token
// from Pinterest Developer Portal (Sandbox env) → we verify against
// api-sandbox.pinterest.com and store as a normal social_connections row
// flagged with is_sandbox=true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SANDBOX_API = "https://api-sandbox.pinterest.com/v5";

Deno.serve(withPerf({ functionName: "connect-pinterest-sandbox" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authoritative JWT validation
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const accessToken = String(body?.accessToken || "").trim();
    const organizationId = body?.organizationId ? String(body.organizationId) : null;
    const brandTemplateId = body?.brandTemplateId ? String(body.brandTemplateId) : null;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Thiếu access token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!accessToken.startsWith("pina_")) {
      return new Response(JSON.stringify({ error: "Token không hợp lệ. Pinterest sandbox token bắt đầu bằng 'pina_'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify token against sandbox
    const meRes = await fetch(`${SANDBOX_API}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meText = await meRes.text();
    if (!meRes.ok) {
      console.error("[connect-pinterest-sandbox] verify failed:", meRes.status, meText);
      return new Response(
        JSON.stringify({
          error: `Pinterest sandbox từ chối token (HTTP ${meRes.status}). Hãy tạo lại access token mới ở Pinterest Developer Portal.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let me: any = {};
    try { me = JSON.parse(meText); } catch { /* ignore */ }
    const username = me?.username || "sandbox-user";
    const platformUserId = me?.id ? String(me.id) : `sandbox-${userId.slice(0, 8)}`;

    const encAccess = await encrypt(accessToken);
    // Pinterest UI shows "30 days" for sandbox tokens
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Look up existing sandbox connection (per user + brand)
    let q = supabase
      .from("social_connections")
      .select("id")
      .eq("platform", "pinterest")
      .eq("user_id", userId)
      .eq("is_sandbox", true);
    if (brandTemplateId) q = q.eq("brand_template_id", brandTemplateId);
    else q = q.is("brand_template_id", null);
    const { data: existing } = await q.maybeSingle();

    const row = {
      user_id: userId,
      organization_id: organizationId,
      brand_template_id: brandTemplateId,
      platform: "pinterest",
      platform_user_id: platformUserId,
      platform_username: username,
      platform_display_name: `${username} (Sandbox)`,
      access_token: encAccess,
      refresh_token: null,
      token_expires_at: expiresAt,
      is_active: true,
      is_sandbox: true,
      connected_at: new Date().toISOString(),
      scopes: ["boards:read", "boards:write", "pins:read", "pins:write", "user_accounts:read"],
      metadata: {
        sandbox: true,
        manual_token: true,
        verified_at: new Date().toISOString(),
      },
    };

    if (existing) {
      const { error } = await supabase.from("social_connections").update(row).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("social_connections").insert(row);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        account: { username, id: platformUserId },
        message: "Đã kết nối Pinterest Sandbox. Lưu ý: Pin tạo ra sẽ KHÔNG hiển thị trên Pinterest thật.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[connect-pinterest-sandbox] error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
