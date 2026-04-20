// One-off: re-register webhooks for all active Telegram bots.
// Trigger via anon call (no auth needed — idempotent admin task).
// Delete after deploying the callback_query fix.
import { getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { setWebhook, getWebhookInfo } from "../_shared/telegram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const service = getServiceClient();
    const { data: configs, error } = await service
      .from("telegram_bot_configs")
      .select("organization_id, bot_username, bot_token_encrypted, webhook_secret")
      .eq("is_active", true);
    if (error) throw error;

    const globalSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    if (!globalSecret) throw new Error("TELEGRAM_WEBHOOK_SECRET missing");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const results = [];
    for (const cfg of configs ?? []) {
      try {
        const botToken = await decryptCredential((cfg as any).bot_token_encrypted);
        const webhookUrl = `${supabaseUrl}/functions/v1/telegram-webhook/${(cfg as any).webhook_secret}`;
        const set = await setWebhook(botToken, webhookUrl, globalSecret, true);
        const info = await getWebhookInfo(botToken);
        results.push({
          bot: (cfg as any).bot_username,
          set_ok: set.ok,
          set_desc: set.description,
          allowed_updates: (info as any)?.result?.allowed_updates ?? null,
        });
      } catch (e) {
        results.push({ bot: (cfg as any).bot_username, error: String(e) });
      }
    }
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
