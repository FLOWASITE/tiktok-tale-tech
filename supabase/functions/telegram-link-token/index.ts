import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { signLinkToken } from "../_shared/telegram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withPerf({ functionName: "telegram-link-token" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Pre-flight: ensure required secret is configured before doing anything else.
    if (!Deno.env.get("TELEGRAM_LINK_SECRET")) {
      console.error("[telegram-link-token] TELEGRAM_LINK_SECRET not configured");
      return json(
        {
          error: "Hệ thống chưa cấu hình TELEGRAM_LINK_SECRET. Liên hệ admin.",
          code: "MISSING_SECRET",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Thiếu Authorization header", code: "NO_AUTH" }, 401);
    }
    const accessToken = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: claimsData, error: authError } = await (authClient.auth as typeof authClient.auth & {
      getClaims: (token: string) => Promise<{ data: { claims?: { sub?: string } } | null; error: { message?: string } | null }>;
    }).getClaims(accessToken);
    const userId = claimsData?.claims?.sub;
    if (authError || !userId) {
      console.error("[telegram-link-token] auth failed:", authError?.message);
      return json(
        { error: "Phiên đăng nhập không hợp lệ", code: "INVALID_SESSION", details: authError?.message },
        401,
      );
    }
    const user = { id: userId };

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id as string | undefined;
    if (!organizationId) {
      return json(
        { error: "Thiếu organization_id", code: "MISSING_ORG" },
        400,
      );
    }

    const service = getServiceClient();

    // Verify user is active org member
    const { data: member, error: memberError } = await service
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      console.error("[telegram-link-token] member query error:", memberError);
      return json(
        { error: "Lỗi truy vấn tổ chức", code: "DB_ERROR", details: memberError.message },
        500,
      );
    }
    if (!member) {
      return json(
        { error: "Bạn không thuộc tổ chức này", code: "NOT_MEMBER" },
        403,
      );
    }

    // Load bot config: try BYOB first, fall back to Flowa default bot sentinel.
    let usingDefaultBot = false;
    let { data: botConfig, error: botError } = await service
      .from("telegram_bot_configs")
      .select("bot_username, is_active")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (botError) {
      console.error("[telegram-link-token] bot config query error:", botError);
      return json(
        { error: "Lỗi truy vấn cấu hình bot", code: "DB_ERROR", details: botError.message },
        500,
      );
    }

    if (!botConfig || !botConfig.is_active) {
      const { data: defaultBot, error: defaultErr } = await service
        .from("telegram_bot_configs")
        .select("bot_username, is_active")
        .is("organization_id", null)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      if (defaultErr) {
        console.error("[telegram-link-token] default bot query error:", defaultErr);
      }
      if (defaultBot) {
        botConfig = defaultBot;
        usingDefaultBot = true;
      }
    }

    if (!botConfig) {
      return json(
        {
          error: "Chưa có bot Telegram khả dụng. Liên hệ admin hoặc dùng bot mặc định của Flowa.",
          code: "NO_BOT_CONFIG",
          needs_admin_setup: true,
        },
        404,
      );
    }

    const token = await signLinkToken({
      uid: user.id,
      org: organizationId,
      ttlSeconds: 600,
    });

    console.log("[telegram-link-token] generated compact token", {
      organizationId,
      bot: botConfig.bot_username,
      using_default_bot: usingDefaultBot,
      tokenLength: token.length,
    });

    const deeplink = `https://t.me/${botConfig.bot_username}?start=${token}`;

    return json({
      token,
      deeplink,
      expires_in: 600,
      bot_username: botConfig.bot_username,
      using_default_bot: usingDefaultBot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[telegram-link-token] Unhandled error:", message, error);
    return json(
      { error: message, code: "INTERNAL_ERROR" },
      500,
    );
  }
}));
