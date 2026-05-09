import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("social_platform_settings")
      .select("consumer_key, consumer_secret, is_active")
      .eq("platform", "google_signin")
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ success: false, error: "Chưa cấu hình Client ID/Secret cho Google Sign-In." });
    if (!data.is_active) return json({ success: false, error: "Google Sign-In settings đang tạm dừng (is_active=false)." });
    if (!data.consumer_key || !data.consumer_secret) return json({ success: false, error: "Thiếu Client ID hoặc Client Secret." });

    let clientId = "", clientSecret = "";
    try {
      [clientId, clientSecret] = await Promise.all([decrypt(data.consumer_key), decrypt(data.consumer_secret)]);
    } catch (e: any) {
      return json({ success: false, error: `Không giải mã được credentials: ${e.message}` });
    }

    if (!clientId.endsWith(".apps.googleusercontent.com")) {
      return json({ success: false, error: "Client ID không đúng định dạng Google (phải kết thúc bằng .apps.googleusercontent.com)." });
    }
    if (clientSecret.length < 10) {
      return json({ success: false, error: "Client Secret quá ngắn." });
    }

    // Ping Google discovery
    const discoRes = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    if (!discoRes.ok) return json({ success: false, error: `Không kết nối được Google (${discoRes.status})` });
    await discoRes.text();

    // Probe credentials: gửi refresh token bogus → Google trả về invalid_grant nếu creds OK,
    // invalid_client nếu Client ID/Secret sai.
    const probeRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: "lovable-test-bogus-refresh-token",
        grant_type: "refresh_token",
      }),
    });
    const probeJson = await probeRes.json().catch(() => ({}));
    const errCode = (probeJson?.error || "").toString();

    const prefix = clientId.slice(0, 12);
    console.log(`[test-google-signin-credentials] probe error=${errCode} clientId=${prefix}...`);

    if (errCode === "invalid_client") {
      return json({
        success: false,
        error: "Google từ chối Client ID/Secret (invalid_client). Kiểm tra lại cặp credential trên Google Cloud Console.",
      });
    }

    // invalid_grant (mong đợi) hoặc các lỗi khác liên quan refresh token → credentials hợp lệ
    return json({
      success: true,
      message: `Client ID/Secret hợp lệ. Sẵn sàng dùng cho Sign in with Google.`,
      details: {
        client_id_prefix: `${prefix}...`,
        secret_length: clientSecret.length,
        google_probe: errCode || "ok",
      },
    });
  } catch (error: any) {
    console.error("[test-google-signin-credentials] Error:", error);
    return json({ success: false, error: error.message || "Internal error" }, 500);
  }
});
