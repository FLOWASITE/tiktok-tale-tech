// Push helpers for Telegram bot.
// Used by agent-approve, agent-pipeline, etc. to notify users in Telegram
// about pipeline events (need approval, completed, failed, etc.).

import { decryptCredential } from "./crypto.ts";

const TELEGRAM_API = "https://api.telegram.org";

export interface InlineButton {
  text: string;
  callback_data?: string; // <= 64 bytes
  url?: string;
}

export type InlineKeyboard = InlineButton[][];

interface PushTarget {
  chatId: number;
  botToken: string;
}

interface OrgBotInfo {
  botToken: string;
  organizationId: string;
}

// Resolve the org's bot token (decrypted). Returns null if no active bot.
// deno-lint-ignore no-explicit-any
async function getOrgBotToken(supabase: any, organizationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("telegram_bot_configs")
    .select("bot_token_encrypted")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data?.bot_token_encrypted) return null;
  try {
    return await decryptCredential(data.bot_token_encrypted);
  } catch (e) {
    console.error("[telegram-notifier] decrypt token failed:", e);
    return null;
  }
}

// Resolve all targets for an org (private DM bindings of org admins/owners,
// plus group binding if any). For approval-style messages we want admins.
export async function resolveAdminTargets(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
): Promise<PushTarget[]> {
  const botToken = await getOrgBotToken(supabase, organizationId);
  if (!botToken) return [];

  // Get admin user_ids
  const { data: admins } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);

  const adminIds = (admins ?? []).map((m: { user_id: string }) => m.user_id);
  if (adminIds.length === 0) return [];

  // Get their DM bindings
  const { data: bindings } = await supabase
    .from("telegram_chat_bindings")
    .select("telegram_chat_id")
    .eq("organization_id", organizationId)
    .eq("chat_type", "private")
    .eq("is_active", true)
    .in("user_id", adminIds);

  return (bindings ?? []).map((b: { telegram_chat_id: number }) => ({
    chatId: Number(b.telegram_chat_id),
    botToken,
  }));
}

// Resolve a single user's DM target (for "your pipeline finished" type messages)
export async function resolveUserTarget(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  userId: string,
): Promise<PushTarget | null> {
  const botToken = await getOrgBotToken(supabase, organizationId);
  if (!botToken) return null;

  const { data: binding } = await supabase
    .from("telegram_chat_bindings")
    .select("telegram_chat_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("chat_type", "private")
    .eq("is_active", true)
    .maybeSingle();

  if (!binding) return null;
  return { chatId: Number(binding.telegram_chat_id), botToken };
}

export function escapeMd(s: string): string {
  return (s || "").replace(/([_*\[\]`])/g, "\\$1");
}

interface SendOpts {
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: { inline_keyboard: InlineKeyboard };
  disable_web_page_preview?: boolean;
}

async function sendOne(
  target: PushTarget,
  text: string,
  opts: SendOpts = {},
): Promise<void> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${target.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: target.chatId, text, ...opts }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[telegram-notifier] send failed chat=${target.chatId}:`, res.status, body);
    }
  } catch (e) {
    console.warn(`[telegram-notifier] send error chat=${target.chatId}:`, e);
  }
}

// Push to many targets in parallel; never throws.
export async function pushMany(
  targets: PushTarget[],
  text: string,
  opts: SendOpts = {},
): Promise<void> {
  if (targets.length === 0) return;
  await Promise.allSettled(targets.map((t) => sendOne(t, text, opts)));
}

// Convenience builder for an "approval needed" inline keyboard.
// callback_data must stay <= 64 bytes — use short prefix + approval id.
export function approvalKeyboard(approvalId: string): InlineKeyboard {
  return [
    [
      { text: "✅ Duyệt", callback_data: `apv:a:${approvalId}` },
      { text: "❌ Từ chối", callback_data: `apv:r:${approvalId}` },
    ],
  ];
}

// Notify admins that a pipeline needs approval.
export async function notifyApprovalNeeded(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  approvalId: string,
  contentTitle: string,
  contentPreview?: string | null,
): Promise<void> {
  const targets = await resolveAdminTargets(supabase, organizationId);
  if (targets.length === 0) {
    console.log("[telegram-notifier] no admin targets for org", organizationId);
    return;
  }

  const title = escapeMd(contentTitle.slice(0, 80));
  const preview = contentPreview
    ? `\n\n${escapeMd(contentPreview.slice(0, 280))}${contentPreview.length > 280 ? "…" : ""}`
    : "";

  const text = `🔔 *Cần duyệt nội dung*\n\n📝 ${title}${preview}\n\n_Bấm nút bên dưới để xử lý ngay._`;

  await pushMany(targets, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: approvalKeyboard(approvalId) },
    disable_web_page_preview: true,
  });
}

// Notify the goal owner that their pipeline is done.
export async function notifyPipelineCompleted(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  userId: string,
  contentTitle: string,
): Promise<void> {
  const target = await resolveUserTarget(supabase, organizationId, userId);
  if (!target) return;
  const text = `✅ Pipeline *${escapeMd(contentTitle.slice(0, 80))}* đã hoàn tất.\nDùng /status để xem chi tiết.`;
  await pushMany([target], text, { parse_mode: "Markdown" });
}

// Notify on publish success/failure.
export async function notifyPublishResult(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  userId: string | null,
  contentTitle: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const targets = userId
    ? [await resolveUserTarget(supabase, organizationId, userId)].filter(Boolean) as PushTarget[]
    : await resolveAdminTargets(supabase, organizationId);
  if (targets.length === 0) return;
  const title = escapeMd(contentTitle.slice(0, 80));
  const text = success
    ? `🚀 Đã đăng *${title}* thành công.`
    : `⚠️ Đăng *${title}* thất bại.${errorMessage ? `\n\n_${escapeMd(errorMessage.slice(0, 200))}_` : ""}`;
  await pushMany(targets, text, { parse_mode: "Markdown" });
}

// Answer a callback_query (must be called within 15s to remove the loading spinner)
export async function answerCallback(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text?.slice(0, 200),
        show_alert: showAlert,
      }),
    });
  } catch (e) {
    console.warn("[telegram-notifier] answerCallback failed:", e);
  }
}

// Edit a message's text/keyboard (used after approve/reject to update the original push)
export async function editMessageText(
  botToken: string,
  chatId: number,
  messageId: number,
  text: string,
  opts: SendOpts = {},
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        ...opts,
      }),
    });
  } catch (e) {
    console.warn("[telegram-notifier] editMessageText failed:", e);
  }
}
