import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getGscClientCredentials, GSC_REDIRECT_URI, GSC_SCOPES } from "../_shared/gsc-credentials.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id, brand_template_id, return_url } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { clientId } = await getGscClientCredentials(supabase);
    const state = btoa(JSON.stringify({ user_id: user.id, organization_id, brand_template_id, return_url, ts: Date.now() }));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: GSC_REDIRECT_URI,
      response_type: "code",
      scope: GSC_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return new Response(JSON.stringify({ auth_url: authUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[gsc-oauth-start] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
