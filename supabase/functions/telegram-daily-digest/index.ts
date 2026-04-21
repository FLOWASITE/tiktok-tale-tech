// Daily digest cron — runs at 08:00 ICT.
// For each user with `daily_digest=true`, summarize today's pending approvals
// + finished campaigns and push via the org's Telegram bot.

import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { sendMessage } from "../_shared/telegram-client.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { escapeMd } from "../_shared/telegram-notifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Pref {
  user_id: string;
  organization_id: string;
  daily_digest: boolean;
}

Deno.serve(withPerf({ functionName: "telegram-daily-digest" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = getServiceClient();
  let dispatched = 0;

  try {
    // 1. All users opted-in
    const { data: prefs, error: prefErr } = await supabase
      .from("telegram_user_preferences")
      .select("user_id, organization_id, daily_digest")
      .eq("daily_digest", true);
    if (prefErr) throw prefErr;

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 2. Group by org → batch resolve binding + bot
    const orgMap = new Map<string, Pref[]>();
    for (const p of (prefs ?? []) as Pref[]) {
      const arr = orgMap.get(p.organization_id) ?? [];
      arr.push(p);
      orgMap.set(p.organization_id, arr);
    }

    for (const [orgId, list] of orgMap.entries()) {
      const { data: cfg } = await supabase
        .from("telegram_bot_configs")
        .select("bot_token_encrypted, is_active")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!cfg || !cfg.is_active) continue;

      let botToken: string;
      try {
        botToken = await decryptCredential((cfg as { bot_token_encrypted: string }).bot_token_encrypted);
      } catch (e) {
        console.warn(`[daily-digest] decrypt failed org=${orgId}:`, e);
        continue;
      }

      // Pending approvals for the org
      const { data: pending } = await supabase
        .from("agent_approvals")
        .select("id, content_preview, created_at")
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      const pendingCount = (pending ?? []).length;

      // Campaigns completed in last 24h
      const { data: completed } = await supabase
        .from("agent_pipelines")
        .select("content_title")
        .eq("organization_id", orgId)
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false })
        .limit(5);
      const completedCount = (completed ?? []).length;

      if (pendingCount === 0 && completedCount === 0) continue; // nothing to say

      const lines: string[] = [`📅 *Tóm tắt hôm nay — Flowa*`, ""];
      if (pendingCount > 0) {
        lines.push(`📋 *${pendingCount} bài chờ duyệt*`);
        for (const a of pending!.slice(0, 3) as Array<{ content_preview: string | null }>) {
          const t = (a.content_preview || "Không tên").slice(0, 50);
          lines.push(`  • ${escapeMd(t)}`);
        }
        lines.push("");
      }
      if (completedCount > 0) {
        lines.push(`✅ *${completedCount} pipeline đã xong (24h qua)*`);
        for (const p of completed!.slice(0, 3) as Array<{ content_title: string | null }>) {
          const t = (p.content_title || "Không tên").slice(0, 50);
          lines.push(`  • ${escapeMd(t)}`);
        }
      }

      const reply_markup = {
        inline_keyboard: pendingCount > 0
          ? [[{ text: "📋 Duyệt ngay", url: "https://app.flowa.one/agents" }]]
          : [[{ text: "📊 Mở dashboard", url: "https://app.flowa.one/dashboard" }]],
      };

      // Look up each user's binding chat
      for (const pref of list) {
        const { data: binding } = await supabase
          .from("telegram_chat_bindings")
          .select("telegram_chat_id")
          .eq("organization_id", orgId)
          .eq("user_id", pref.user_id)
          .eq("chat_type", "private")
          .eq("is_active", true)
          .maybeSingle();
        const chatId = (binding as { telegram_chat_id: number } | null)?.telegram_chat_id;
        if (!chatId) continue;

        try {
          await sendMessage(botToken, chatId, lines.join("\n"), {
            parse_mode: "Markdown",
            reply_markup,
            disable_web_page_preview: true,
          });
          dispatched += 1;
        } catch (e) {
          console.warn(`[daily-digest] send failed user=${pref.user_id}:`, e);
        }
      }
    }

    return json({ ok: true, dispatched, ms: Date.now() - startedAt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[daily-digest] fatal:", msg);
    return json({ ok: false, error: msg }, 500);
  }
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
