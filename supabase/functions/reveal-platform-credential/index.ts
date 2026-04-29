import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_FIELDS = new Set(["consumer_key", "consumer_secret"]);
const ALLOWED_PLATFORMS = new Set([
  "twitter", "facebook", "instagram", "threads", "linkedin",
  "tiktok", "youtube", "zalo_oa", "google_business", "blogger",
  "wordpress", "website",
]);

Deno.serve(withPerf({ functionName: "reveal-platform-credential" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Admin only
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { platform, field } = body as { platform?: string; field?: string };

    if (!platform || !ALLOWED_PLATFORMS.has(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!field || !ALLOWED_FIELDS.has(field)) {
      return new Response(JSON.stringify({ error: "Invalid field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("social_platform_settings")
      .select("consumer_key, consumer_secret")
      .eq("platform", platform)
      .maybeSingle();

    if (settingsError) {
      console.error("[reveal-platform-credential] DB error:", settingsError);
      throw new Error("Database error");
    }
    if (!settings) {
      return new Response(JSON.stringify({ error: "Chưa cấu hình platform này" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cipher = (settings as Record<string, string | null>)[field];
    if (!cipher) {
      return new Response(JSON.stringify({ error: "Field chưa được cấu hình" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let value: string;
    try {
      value = await decryptCredential(cipher);
    } catch (e) {
      console.error("[reveal-platform-credential] decrypt failed:", (e as Error).message);
      return new Response(
        JSON.stringify({
          error: "Không giải mã được. Encryption key có thể đã thay đổi — nhập lại credentials qua form này để re-encrypt.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Audit (no value)
    console.log(
      `[reveal-platform-credential] admin=${user.id} platform=${platform} field=${field} length=${value.length}`,
    );

    return new Response(JSON.stringify({ value }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[reveal-platform-credential] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
