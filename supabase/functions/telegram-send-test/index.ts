// Send a test "ping" message via the org's Telegram bot to the user's
// linked private chat. Used by the UI's "Test ping" button to let users
// verify their Telegram connection without leaving Flowa.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { decryptCredential } from "../_shared/crypto.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const accessToken = authHeader.replace("Bearer ", "");

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    // deno-lint-ignore no-explicit-any
    const { data: claimsData, error: authErr } = await (authClient.auth as any)
      .getClaims(accessToken);
    const userId = claimsData?.claims?.sub;
    if (authErr || !userId) return json({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const orgId = String(body.organization_id || "").trim();
    if (!orgId) return json({ error: "organization_id is required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Verify user is org member
    const { data: member } = await service
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return json({ error: "Bạn không thuộc tổ chức này" }, 403);

    // 2. Load private DM binding
    const { data: binding } = await service
      .from("telegram_chat_bindings")
      .select("telegram_chat_id, telegram_username")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("chat_type", "private")
      .eq("is_active", true)
      .maybeSingle();
    if (!binding) {
      return json({
        ok: false,
        error: "Bạn chưa link Telegram. Bấm 'Mở Telegram' ở trên để kết nối.",
        code: "not_linked",
      }, 200);
    }

    // 3. Load bot config (BYOB first, then default)
    let { data: botConfig } = await service
      .from("telegram_bot_configs")
      .select("bot_token_encrypted, is_active, bot_username")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!botConfig || !botConfig.is_active) {
      const { data: defaultBot } = await service
        .from("telegram_bot_configs")
        .select("bot_token_encrypted, is_active, bot_username")
        .is("organization_id", null)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      botConfig = defaultBot;
    }

    if (!botConfig?.bot_token_encrypted) {
      return json({
        ok: false,
        error: "Bot Telegram của tổ chức đang tắt. Liên hệ admin.",
        code: "bot_inactive",
      }, 200);
    }

    // 4. Decrypt + send
    const botToken = await decryptCredential(botConfig.bot_token_encrypted);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const text = `🟢 Test từ Flowa lúc ${hh}:${mm}. AI Agent sẵn sàng — chat tự nhiên hoặc gõ /campaign để bắt đầu.`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: binding.telegram_chat_id,
        text,
        parse_mode: "HTML",
      }),
    });
    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      console.error("[telegram-send-test] Telegram API error:", tgData);
      return json({
        error: tgData.description || "Telegram từ chối gửi tin",
        code: "telegram_error",
      }, 502);
    }

    return json({ ok: true, sent_at: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[telegram-send-test] fatal:", msg);
    return json({ error: msg }, 500);
  }
});
