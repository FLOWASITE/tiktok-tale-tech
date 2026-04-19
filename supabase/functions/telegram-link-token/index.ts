import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { signLinkToken } from "../_shared/telegram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withPerf({ functionName: "telegram-link-token" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Thiếu Authorization header" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const organizationId = body.organization_id as string | undefined;
    if (!organizationId) {
      return json({ error: "Thiếu organization_id" }, 400);
    }

    const service = getServiceClient();

    // Verify user is active org member
    const { data: member, error: memberError } = await service
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!member) {
      return json({ error: "Bạn không thuộc tổ chức này" }, 403);
    }

    // Load bot config for this org
    const { data: botConfig, error: botError } = await service
      .from("telegram_bot_configs")
      .select("bot_username, is_active")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (botError) throw botError;
    if (!botConfig || !botConfig.is_active) {
      return json(
        {
          error: "Tổ chức chưa cấu hình bot Telegram",
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

    const deeplink = `https://t.me/${botConfig.bot_username}?start=${token}`;

    return json({ token, deeplink, expires_in: 600 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[telegram-link-token] Error:", message);
    return json({ error: message }, 500);
  }
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
