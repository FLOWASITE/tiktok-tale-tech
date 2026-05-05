import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getGscClientCredentials, GSC_REDIRECT_URI, GSC_SCOPES } from "../_shared/gsc-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlClose(message: string, ok: boolean, returnUrl?: string) {
  const safeMsg = message.replace(/</g, "&lt;");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GSC</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#111}
.box{max-width:420px;text-align:center;padding:32px;background:#fff;border:1px solid #e5e5e5;border-radius:12px}
.ok{color:#059669}.err{color:#dc2626}</style></head>
<body><div class="box"><h2 class="${ok ? 'ok' : 'err'}">${ok ? '✓ Đã kết nối GSC' : '✗ Lỗi kết nối'}</h2>
<p>${safeMsg}</p><p style="color:#666;font-size:13px">Cửa sổ này sẽ tự đóng…</p></div>
<script>
  try { window.opener && window.opener.postMessage({ type: 'gsc_oauth', ok: ${ok}, message: ${JSON.stringify(message)} }, '*'); } catch(e){}
  setTimeout(() => { ${returnUrl ? `window.location.href=${JSON.stringify(returnUrl)}` : 'window.close()'}; }, 1500);
</script></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return new Response(htmlClose(`Google trả lỗi: ${errorParam}`, false), { headers: { "Content-Type": "text/html" } });
  if (!code || !stateRaw) return new Response(htmlClose("Thiếu code/state", false), { headers: { "Content-Type": "text/html" } });

  try {
    const state = JSON.parse(atob(stateRaw));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { clientId, clientSecret } = await getGscClientCredentials(supabase);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: GSC_REDIRECT_URI, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${JSON.stringify(tokens)}`);

    // Get user email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Get list of GSC sites
    const sitesRes = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const sitesJson = await sitesRes.json();
    const sites = (sitesJson.siteEntry || []).filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
    if (!sites.length) return new Response(htmlClose("Tài khoản Google này không có site nào trong Search Console.", false), { headers: { "Content-Type": "text/html" } });

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    // Insert/update connection cho mỗi site
    for (const site of sites) {
      await supabase.from("gsc_connections").upsert({
        organization_id: state.organization_id,
        brand_template_id: state.brand_template_id || null,
        site_url: site.siteUrl,
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        scopes: GSC_SCOPES,
        is_active: true,
        created_by: state.user_id,
      }, { onConflict: "organization_id,site_url" });
    }

    return new Response(htmlClose(`Đã kết nối ${sites.length} site GSC (${userInfo.email}).`, true, state.return_url), { headers: { "Content-Type": "text/html" } });
  } catch (error: any) {
    console.error("[gsc-oauth-callback] Error:", error);
    return new Response(htmlClose(error.message || "Internal error", false), { headers: { "Content-Type": "text/html" } });
  }
});
