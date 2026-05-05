import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REDIRECT_URI = `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/gsc-oauth-callback`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("social_platform_settings")
      .select("consumer_key, consumer_secret, is_active")
      .eq("platform", "google_search_console")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ success: false, error: "Chưa cấu hình Client ID/Secret cho Google Search Console." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!data.is_active) {
      return new Response(JSON.stringify({ success: false, error: "GSC settings đang tạm dừng (is_active=false)." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!data.consumer_key || !data.consumer_secret) {
      return new Response(JSON.stringify({ success: false, error: "Thiếu Client ID hoặc Client Secret." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let clientId = "", clientSecret = "";
    try {
      [clientId, clientSecret] = await Promise.all([decrypt(data.consumer_key), decrypt(data.consumer_secret)]);
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: `Không giải mã được credentials: ${e.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!clientId.endsWith(".apps.googleusercontent.com")) {
      return new Response(JSON.stringify({ success: false, error: "Client ID không đúng định dạng Google (phải kết thúc bằng .apps.googleusercontent.com)." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (clientSecret.length < 10) {
      return new Response(JSON.stringify({ success: false, error: "Client Secret quá ngắn." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ping Google discovery để chắc Google reachable
    const discoRes = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    if (!discoRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Không kết nối được Google (${discoRes.status})` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await discoRes.text();

    const prefix = clientId.slice(0, 12);
    console.log(`[test-gsc-credentials] OK clientId=${prefix}... secret_len=${clientSecret.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Client ID/Secret hợp lệ. Sẵn sàng OAuth.`,
      details: {
        client_id_prefix: `${prefix}...`,
        client_secret_length: clientSecret.length,
        redirect_uri: REDIRECT_URI,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[test-gsc-credentials] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
