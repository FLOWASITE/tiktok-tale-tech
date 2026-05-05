import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getValidAccessToken } from "../_shared/gsc-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: connections, error } = await supabase
      .from("gsc_connections")
      .select("*")
      .eq("is_active", true)
      .limit(1);
    if (error) throw error;
    if (!connections?.length) {
      return new Response(JSON.stringify({ success: false, error: "Chưa có connection GSC nào. Hãy bấm 'Kết nối Google Search Console' trong tab GSC trước." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const conn = connections[0];
    const accessToken = await getValidAccessToken(supabase, conn);
    const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, error: `Google API trả lỗi: ${JSON.stringify(json)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sites = (json.siteEntry || []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
    return new Response(JSON.stringify({
      success: true,
      message: `Kết nối OK. Tài khoản ${conn.google_email} có ${sites.length} site.`,
      details: { sites_count: sites.length, last_synced_at: conn.last_synced_at, site_url: conn.site_url },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[test-gsc-connection] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
