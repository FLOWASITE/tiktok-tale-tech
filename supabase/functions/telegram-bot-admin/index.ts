// Admin-only endpoint to manage per-org Telegram bot config.
// - upsert: encrypts bot_token server-side and writes telegram_bot_configs row
// - register_webhook: calls Telegram setWebhook with the per-org path secret
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt } from "../_shared/crypto.ts";
import { setWebhook } from "../_shared/telegram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withPerf({ functionName: "telegram-bot-admin" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Thiếu Authorization" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { action, organization_id } = body as {
      action: string;
      organization_id: string;
    };
    if (!organization_id) return json({ error: "Thiếu organization_id" }, 400);

    const service = getServiceClient();

    // Verify caller is admin/owner of the org
    const { data: member } = await service
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || !["owner", "admin"].includes((member as any).role)) {
      return json({ error: "Chỉ admin tổ chức mới thực hiện được" }, 403);
    }

    if (action === "upsert") {
      const { bot_username, bot_token, default_autonomy_level, is_active } =
        body as {
          bot_username: string;
          bot_token: string;
          default_autonomy_level?: string;
          is_active?: boolean;
        };

      if (!bot_username || !bot_token) {
        return json({ error: "Thiếu bot_username hoặc bot_token" }, 400);
      }

      // Preserve existing webhook_secret if already set; else generate new one
      const { data: existing } = await service
        .from("telegram_bot_configs")
        .select("id, webhook_secret")
        .eq("organization_id", organization_id)
        .maybeSingle();

      const webhookSecret = (existing as any)?.webhook_secret ??
        generateHexSecret(32);

      const encryptedToken = await encrypt(bot_token);

      const row = {
        organization_id,
        bot_username: bot_username.replace(/^@/, ""),
        bot_token_encrypted: encryptedToken,
        webhook_secret: webhookSecret,
        default_autonomy_level: default_autonomy_level ?? "human_in_loop",
        is_active: is_active ?? true,
        created_by: user.id,
      };

      const { error: upsertError } = await service
        .from("telegram_bot_configs")
        .upsert(row, { onConflict: "organization_id" });

      if (upsertError) throw upsertError;

      return json({ ok: true, webhook_secret: webhookSecret });
    }

    if (action === "register_webhook") {
      const { data: cfg, error: cfgErr } = await service
        .from("telegram_bot_configs")
        .select("bot_token_encrypted, webhook_secret")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (cfgErr) throw cfgErr;
      if (!cfg) return json({ error: "Chưa có cấu hình bot" }, 404);

      const { decryptCredential } = await import("../_shared/crypto.ts");
      const botToken = await decryptCredential((cfg as any).bot_token_encrypted);

      const globalSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
      if (!globalSecret) {
        return json({ error: "TELEGRAM_WEBHOOK_SECRET chưa cấu hình" }, 500);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl =
        `${supabaseUrl}/functions/v1/telegram-webhook/${(cfg as any).webhook_secret}`;

      const result = await setWebhook(botToken, webhookUrl, globalSecret);
      if (!result.ok) {
        return json({ error: `Telegram từ chối: ${result.description}` }, 400);
      }
      return json({ ok: true, webhook_url: webhookUrl });
    }

    return json({ error: `Action không hỗ trợ: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[telegram-bot-admin] Error:", message);
    return json({ error: message }, 500);
  }
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateHexSecret(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
