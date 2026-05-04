// wix-oauth-start
// Build Wix install/authorize URL, return to FE for redirect.
// Wix OAuth = "App install" flow: user installs Flowa app on a Wix site,
// Wix redirects to redirect_uri with ?code=&instanceId=
// State carries userId/brandTemplateId/orgId/frontendOrigin so callback can
// resolve which brand to attach the connection to.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getWixAppId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase
    .from("social_platform_settings")
    .select("consumer_key, is_active")
    .eq("platform", "wix")
    .maybeSingle();
  if (data?.consumer_key && data.is_active !== false) {
    try { return await decryptCredential(data.consumer_key); } catch (e) {
      console.error("[wix-oauth-start] decrypt appId failed:", e);
    }
  }
  return Deno.env.get("WIX_APP_ID") || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Thiếu Authorization token" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { brandTemplateId, organizationId, frontendOrigin } = body as {
      brandTemplateId?: string; organizationId?: string; frontendOrigin?: string;
    };

    const appId = await getWixAppId(supabase);
    if (!appId) {
      return json(
        { error: "Wix App ID chưa cấu hình. Vào Admin → Social Settings → Wix để nhập." },
        500,
      );
    }

    // Resolve org from brand if missing
    let resolvedOrgId = organizationId || null;
    if (!resolvedOrgId && brandTemplateId) {
      const { data: brand } = await supabase
        .from("brand_templates")
        .select("organization_id")
        .eq("id", brandTemplateId)
        .maybeSingle();
      resolvedOrgId = brand?.organization_id || null;
    }

    const nonceBytes = new Uint8Array(24);
    crypto.getRandomValues(nonceBytes);
    const nonce = btoa(String.fromCharCode(...nonceBytes))
      .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

    const stateObj = {
      userId: user.id,
      brandTemplateId: brandTemplateId || null,
      organizationId: resolvedOrgId,
      nonce,
      frontendOrigin: frontendOrigin || null,
    };
    const state = btoa(JSON.stringify(stateObj));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/wix-oauth-callback`;

    // Wix install URL — user picks the site to install on.
    // Docs: https://dev.wix.com/docs/build-apps/develop-your-app/access/authorization/oauth-installation-flow
    const authorizeUrl = new URL("https://www.wix.com/installer/install");
    authorizeUrl.searchParams.set("appId", appId);
    authorizeUrl.searchParams.set("redirectUrl", redirectUri);
    authorizeUrl.searchParams.set("state", state);

    return json({ success: true, authorization_url: authorizeUrl.toString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[wix-oauth-start]", msg);
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
