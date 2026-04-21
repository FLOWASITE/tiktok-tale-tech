// Admin-only endpoint to manage per-org Telegram bot config.
// - upsert: encrypts bot_token server-side and writes telegram_bot_configs row
// - register_webhook: calls Telegram setWebhook with the per-org path secret
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt } from "../_shared/crypto.ts";
import { setWebhook, getWebhookInfo, setMyCommands, setChatMenuButton } from "../_shared/telegram-client.ts";

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
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Thiếu Authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      console.error("[telegram-bot-admin] auth fail:", authError?.message);
      return json({ error: "Unauthorized", details: authError?.message }, 401);
    }
    const user = { id: userData.user.id };

    const body = await req.json();
    const { action, organization_id } = body as {
      action: string;
      organization_id?: string;
    };

    const service = getServiceClient();

    // seed_default_bot: super-admin only, no org scope (sentinel row).
    // Must be checked BEFORE the per-org member check.
    if (action === "seed_default_bot") {
      const allowlist = (Deno.env.get("FLOWA_SUPERADMIN_USER_IDS") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!allowlist.includes(user.id)) {
        return json({ error: "Chỉ super-admin mới seed được default bot" }, 403);
      }

      const botToken = Deno.env.get("FLOWA_DEFAULT_BOT_TOKEN");
      const botUsername = Deno.env.get("FLOWA_DEFAULT_BOT_USERNAME");
      const webhookSecret = Deno.env.get("FLOWA_DEFAULT_BOT_WEBHOOK_SECRET");
      if (!botToken || !botUsername || !webhookSecret) {
        return json({
          error: "Thiếu env: FLOWA_DEFAULT_BOT_TOKEN / FLOWA_DEFAULT_BOT_USERNAME / FLOWA_DEFAULT_BOT_WEBHOOK_SECRET",
        }, 500);
      }
      const globalSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
      if (!globalSecret) {
        return json({ error: "TELEGRAM_WEBHOOK_SECRET chưa cấu hình" }, 500);
      }

      const encryptedToken = await encrypt(botToken);

      // Upsert sentinel: organization_id IS NULL + is_default = true (unique index guarantees single row)
      const { data: existing } = await service
        .from("telegram_bot_configs")
        .select("id")
        .is("organization_id", null)
        .eq("is_default", true)
        .maybeSingle();

      if (existing) {
        const { error: updErr } = await service
          .from("telegram_bot_configs")
          .update({
            bot_username: botUsername.replace(/^@/, ""),
            bot_token_encrypted: encryptedToken,
            webhook_secret: webhookSecret,
            is_active: true,
          })
          .eq("id", (existing as { id: string }).id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await service
          .from("telegram_bot_configs")
          .insert({
            organization_id: null,
            is_default: true,
            bot_username: botUsername.replace(/^@/, ""),
            bot_token_encrypted: encryptedToken,
            webhook_secret: webhookSecret,
            default_autonomy_level: "human_in_loop",
            is_active: true,
            created_by: user.id,
          });
        if (insErr) throw insErr;
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook/${webhookSecret}`;
      const whResult = await setWebhook(botToken, webhookUrl, globalSecret, true);
      if (!whResult.ok) {
        return json({ error: `setWebhook từ chối: ${whResult.description}` }, 400);
      }
      const cmdResult = await setMyCommands(botToken);
      if (!cmdResult.ok) {
        console.warn("[telegram-bot-admin] seed setMyCommands warn:", cmdResult.description);
      }
      const miniAppUrl = Deno.env.get("TELEGRAM_MINIAPP_URL") || "https://app.flowa.one/telegram-app";
      const menuResult = await setChatMenuButton(botToken, miniAppUrl, "🚀 Mở Flowa");
      if (!menuResult.ok) {
        console.warn("[telegram-bot-admin] seed setChatMenuButton warn:", menuResult.description);
      }

      return json({
        ok: true,
        bot_username: botUsername,
        webhook_url: webhookUrl,
        commands_synced: cmdResult.ok,
        menu_button_set: menuResult.ok,
      });
    }

    if (!organization_id) return json({ error: "Thiếu organization_id" }, 400);

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

      // Drop pending updates on manual re-register to clear any stuck backlog
      const result = await setWebhook(botToken, webhookUrl, globalSecret, true);
      if (!result.ok) {
        return json({ error: `Telegram từ chối: ${result.description}` }, 400);
      }
      // Sync native command menu (non-blocking — log warn on fail)
      const cmdResult = await setMyCommands(botToken);
      if (!cmdResult.ok) {
        console.warn("[telegram-bot-admin] setMyCommands warning:", cmdResult.description);
      }
      return json({ ok: true, webhook_url: webhookUrl, commands_synced: cmdResult.ok });
    }

    if (action === "sync_commands") {
      const { data: cfg, error: cfgErr } = await service
        .from("telegram_bot_configs")
        .select("bot_token_encrypted")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (cfgErr) throw cfgErr;
      if (!cfg) return json({ error: "Chưa có cấu hình bot" }, 404);

      const { decryptCredential } = await import("../_shared/crypto.ts");
      const botToken = await decryptCredential((cfg as any).bot_token_encrypted);

      const result = await setMyCommands(botToken);
      if (!result.ok) {
        return json({ error: `Telegram từ chối: ${result.description}` }, 400);
      }
      return json({ ok: true });
    }

    if (action === "webhook_info") {
      const { data: cfg, error: cfgErr } = await service
        .from("telegram_bot_configs")
        .select("bot_token_encrypted")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (cfgErr) throw cfgErr;
      if (!cfg) return json({ error: "Chưa có cấu hình bot" }, 404);

      const { decryptCredential } = await import("../_shared/crypto.ts");
      const botToken = await decryptCredential((cfg as any).bot_token_encrypted);

      const info = await getWebhookInfo(botToken);
      if (!info.ok) {
        return json({ error: `Telegram từ chối: ${info.description}` }, 400);
      }
      return json({ ok: true, info: info.result });
    }

    if (action === "set_menu_button") {
      const { web_app_url } = body as { web_app_url?: string };
      const baseUrl = String(web_app_url || Deno.env.get("TELEGRAM_MINIAPP_URL") || "https://app.flowa.one/telegram-app").trim();
      // Embed ?org=<organization_id> so the Mini App can authenticate immediately.
      // Append ?v=tg-auth-v2 to bust Telegram WebView cache after auth-flow fixes.
      const MINI_APP_VERSION = "tg-auth-v2";
      let url = baseUrl;
      try {
        const u = new URL(baseUrl);
        u.searchParams.set("org", organization_id);
        u.searchParams.set("v", MINI_APP_VERSION);
        url = u.toString();
      } catch {
        const sep = baseUrl.includes("?") ? "&" : "?";
        url = `${baseUrl}${sep}org=${organization_id}&v=${MINI_APP_VERSION}`;
      }
      const { data: cfg, error: cfgErr } = await service
        .from("telegram_bot_configs")
        .select("bot_token_encrypted")
        .eq("organization_id", organization_id)
        .maybeSingle();
      if (cfgErr) throw cfgErr;
      if (!cfg) return json({ error: "Chưa có cấu hình bot" }, 404);

      const { decryptCredential } = await import("../_shared/crypto.ts");
      const botToken = await decryptCredential((cfg as { bot_token_encrypted: string }).bot_token_encrypted);
      const result = await setChatMenuButton(botToken, url, "🚀 Mở Flowa");
      if (!result.ok) return json({ error: `Telegram từ chối: ${result.description}` }, 400);
      return json({ ok: true, web_app_url: url });
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
