import { decryptCredential } from "../_shared/crypto.ts";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_content_publish";

interface TestRequest {
  platform: string;
  useStoredCredentials?: boolean;
  appId?: string;
  appSecret?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getMetaErrorMessage(payload: any): string {
  if (!payload) return "";
  if (typeof payload.error_message === "string") return payload.error_message;
  if (typeof payload.error?.message === "string") return payload.error.message;
  return "";
}

function getHint(redirectUri: string): string {
  return `Kiểm tra Instagram App ID và Instagram App Secret tại Meta App Dashboard → Instagram → API setup with Instagram login → Business login settings. Đồng thời thêm callback URL này vào Valid OAuth Redirect URIs: ${redirectUri}`;
}

async function verifyAuthorizeEndpoint(appId: string, redirectUri: string) {
  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", INSTAGRAM_SCOPES);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", "lovable_instagram_validation");

  const response = await fetch(authorizeUrl.toString(), {
    method: "GET",
    redirect: "manual",
  });

  const responseText = await response.text();
  const location = response.headers.get("location") || "";
  const combined = `${location}\n${responseText}`.toLowerCase();

  console.log(
    "Instagram authorize probe:",
    response.status,
    location.slice(0, 200),
    responseText.slice(0, 200),
  );

  if (combined.includes("invalid platform app") || combined.includes("invalid_client") || combined.includes("invalid client_id")) {
    throw new Error("Instagram App ID không hợp lệ hoặc app chưa bật Instagram Login.");
  }

  if (combined.includes("redirect_uri") || combined.includes("redirect url") || combined.includes("valid oauth redirect uris")) {
    throw new Error("OAuth Callback URL chưa được cấu hình đúng trong Business login settings.");
  }

  if (response.status >= 400) {
    throw new Error(`Không thể xác minh Instagram authorize endpoint (HTTP ${response.status}).`);
  }
}

async function verifyTokenEndpoint(appId: string, appSecret: string, redirectUri: string) {
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: "lovable_validation_probe",
    }),
  });

  const responseText = await response.text();
  const payload = safeJsonParse(responseText);
  const metaMessage = getMetaErrorMessage(payload);
  const normalizedMessage = metaMessage.toLowerCase();

  console.log(
    "Instagram token probe:",
    response.status,
    responseText.slice(0, 200),
  );

  if (response.ok) {
    return;
  }

  if (
    normalizedMessage.includes("invalid authorization code") ||
    normalizedMessage.includes("authorization code not found") ||
    normalizedMessage.includes("code has expired") ||
    normalizedMessage.includes("invalid code") ||
    normalizedMessage.includes("invalid grant")
  ) {
    return;
  }

  if (normalizedMessage.includes("redirect_uri") || normalizedMessage.includes("redirect uri")) {
    throw new Error("OAuth Callback URL chưa được cấu hình đúng trong Business login settings.");
  }

  if (normalizedMessage.includes("client secret") || normalizedMessage.includes("invalid_client")) {
    throw new Error("Instagram App Secret không hợp lệ.");
  }

  if (
    normalizedMessage.includes("invalid platform app") ||
    normalizedMessage.includes("app id") ||
    normalizedMessage.includes("application") ||
    normalizedMessage.includes("invalid client id")
  ) {
    throw new Error("Instagram App ID không hợp lệ hoặc app chưa bật Instagram Login.");
  }

  if (metaMessage) {
    throw new Error(`Meta API: ${metaMessage}`);
  }

  throw new Error(`Không thể xác minh Instagram token endpoint (HTTP ${response.status}).`);
}

Deno.serve(withPerf({ functionName: "test-instagram-credentials" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`;

  try {
    const supabase = getServiceClient();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((roleRow) => roleRow.role === "admin");
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    const body: TestRequest = await req.json();
    const { platform, useStoredCredentials, appId: rawAppId, appSecret: rawAppSecret } = body;

    if (platform !== "instagram") {
      throw new Error("This endpoint is for Instagram only");
    }

    let appId = rawAppId;
    let appSecret = rawAppSecret;

    if (useStoredCredentials || (!appId && !appSecret)) {
      console.log("Fetching stored credentials for Instagram...");

      const { data: settings, error: settingsError } = await supabase
        .from("social_platform_settings")
        .select("consumer_key, consumer_secret")
        .eq("platform", "instagram")
        .eq("is_active", true)
        .single();

      if (settingsError || !settings) {
        throw new Error("Không tìm thấy cấu hình cho Instagram");
      }

      if (!settings.consumer_key || !settings.consumer_secret) {
        throw new Error("Instagram App ID/Secret chưa được cấu hình");
      }

      appId = await decryptCredential(settings.consumer_key);
      appSecret = await decryptCredential(settings.consumer_secret);

      if (!appId || !appSecret) {
        throw new Error("Không thể giải mã credentials - kiểm tra encryption key");
      }
    }

    if (!appId || !appSecret) {
      throw new Error("Instagram App ID và Instagram App Secret là bắt buộc");
    }

    const maskedId = `${appId.slice(0, 4)}****${appId.slice(-4)}`;
    console.log(`Testing Instagram credentials... appId=${maskedId}, secretLen=${appSecret.length}`);

    await verifyAuthorizeEndpoint(appId, redirectUri);
    await verifyTokenEndpoint(appId, appSecret, redirectUri);

    console.log("Instagram credentials verified successfully!", maskedId);

    return jsonResponse({
      success: true,
      message: "Instagram App ID/App Secret hợp lệ! ✓",
      details: {
        appId: maskedId,
        platform: "instagram",
        redirectUri,
        note: "Credentials đang khớp với Instagram Login flow (Business login settings).",
      },
    });
  } catch (error: any) {
    console.error("Test Instagram credentials error:", error);
    return jsonResponse(
      {
        success: false,
        error: error.message,
        hint: getHint(redirectUri),
      },
      400,
    );
  }
}));