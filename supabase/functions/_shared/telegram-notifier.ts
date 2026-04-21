// Push helpers for Telegram bot.
// Used by agent-approve, agent-pipeline, etc. to notify users in Telegram
// about pipeline events (need approval, completed, failed, etc.).

import { decryptCredential } from "./crypto.ts";

const TELEGRAM_API = "https://api.telegram.org";

export interface InlineButton {
  text: string;
  callback_data?: string; // <= 64 bytes
  url?: string;
  web_app?: { url: string };
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

// Channel emoji map for compact per-channel button labels.
const CHANNEL_EMOJI: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  linkedin: "💼",
  twitter: "🐦",
  x: "🐦",
  threads: "🧵",
  zalo: "💬",
  website: "🌐",
  blog: "📝",
  youtube: "▶️",
  google_business: "📍",
};

function channelButtonLabel(ch: string): string {
  const key = (ch || "").toLowerCase();
  const emoji = CHANNEL_EMOJI[key] ?? "📢";
  // Capitalize first letter for nicer display
  const name = ch.charAt(0).toUpperCase() + ch.slice(1);
  return `${emoji} ${name}`;
}

// Convenience builder for an "approval needed" inline keyboard.
// callback_data must stay <= 64 bytes — use short prefix + approval id.
// When `channels` is supplied, render per-channel approve buttons that open a
// per-channel reschedule menu (apv:c:<id>:<idx>). Otherwise fall back to the
// classic single-decision keyboard.
export function approvalKeyboard(approvalId: string, channels?: string[] | null): InlineKeyboard {
  const miniAppUrl = `https://app.flowa.one/telegram-app?view=approve&id=${approvalId}&v=tg-auth-v2`;
  const rows: InlineKeyboard = [
    [{ text: "👁️ Xem chi tiết", web_app: { url: miniAppUrl } } as unknown as InlineButton],
  ];

  // Per-channel rows (only when 1+ channels — single channel still benefits
  // from explicit per-channel scheduling UX).
  if (channels && channels.length > 0) {
    // Pair channels two-per-row to stay compact.
    for (let i = 0; i < channels.length; i += 2) {
      const row: InlineButton[] = [];
      for (let j = i; j < Math.min(i + 2, channels.length); j++) {
        row.push({
          text: `✅ ${channelButtonLabel(channels[j])}`,
          callback_data: `apv:c:${approvalId}:${j}`,
        });
      }
      rows.push(row);
    }
  }

  // Global actions
  rows.push([
    { text: "✅ Duyệt tất cả", callback_data: `apv:a:${approvalId}` },
    { text: "❌ Từ chối", callback_data: `apv:r:${approvalId}` },
  ]);
  rows.push([{ text: "📅 Đổi lịch tất cả", callback_data: `apv:s:${approvalId}` }]);
  return rows;
}

function formatVnDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ApprovalNotifyOpts {
  channels?: string[] | null;
  scheduledAt?: string | null;
  botUsername?: string | null;
}

// Notify admins that a pipeline needs approval.
// Falls back to linked group(s) if no admin DM is available.
export async function notifyApprovalNeeded(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  approvalId: string,
  contentTitle: string,
  contentPreview?: string | null,
  opts: ApprovalNotifyOpts = {},
): Promise<void> {
  const targets = await resolveAdminTargets(supabase, organizationId);

  const title = escapeMd(contentTitle.slice(0, 80));
  const channelsLine = opts.channels && opts.channels.length > 0
    ? `\n📢 ${escapeMd(opts.channels.join(", "))}`
    : "";
  const scheduleLine = opts.scheduledAt
    ? `\n📅 Sẽ đăng: ${escapeMd(formatVnDateTime(opts.scheduledAt))}`
    : "";
  const preview = contentPreview
    ? `\n\n${escapeMd(contentPreview.slice(0, 200))}${contentPreview.length > 200 ? "…" : ""}`
    : "";

  const text = `🔔 *Cần duyệt nội dung*\n\n📝 ${title}${channelsLine}${scheduleLine}${preview}`;
  const keyboard = approvalKeyboard(approvalId, opts.channels ?? null);

  if (targets.length > 0) {
    await pushMany(targets, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
      disable_web_page_preview: true,
    });
    return;
  }

  // Fallback: post to linked group(s) so admins notice even without DM.
  // Rate-limited per binding via `last_group_fallback_at` so we don't spam
  // groups when many approvals queue up. Cooldown defaults to 30 minutes,
  // overridable per-org via env `TELEGRAM_GROUP_FALLBACK_COOLDOWN_MIN`.
  console.log("[telegram-notifier] no admin DM targets, trying group fallback for org", organizationId);
  const botToken = await getOrgBotToken(supabase, organizationId);
  if (!botToken) return;

  const cooldownMin = (() => {
    const raw = Deno.env.get("TELEGRAM_GROUP_FALLBACK_COOLDOWN_MIN");
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  })();
  const cooldownAgoIso = new Date(Date.now() - cooldownMin * 60 * 1000).toISOString();

  const { data: groups } = await supabase
    .from("telegram_chat_bindings")
    .select("id, telegram_chat_id, last_group_fallback_at, group_fallback_count")
    .eq("organization_id", organizationId)
    .in("chat_type", ["group", "supergroup"])
    .eq("is_active", true);

  // deno-lint-ignore no-explicit-any
  const allGroups = (groups ?? []) as any[];
  if (allGroups.length === 0) return;

  // Partition into "ready to send" vs "in cooldown"
  const ready = allGroups.filter((g) => !g.last_group_fallback_at || g.last_group_fallback_at < cooldownAgoIso);
  const skipped = allGroups.length - ready.length;

  if (ready.length === 0) {
    console.log(
      `[telegram-notifier] all ${allGroups.length} group binding(s) for org ${organizationId} still in cooldown (${cooldownMin}min); skipping reminder for approval ${approvalId}`,
    );
    return;
  }

  const groupTargets: PushTarget[] = ready.map((g) => ({
    chatId: Number(g.telegram_chat_id),
    botToken,
  }));

  const startLink = opts.botUsername
    ? `\n\n👆 Admin chưa kết nối DM bot — vào https://t.me/${opts.botUsername}?start=link để nhận push duyệt riêng.\n_Nhắc nhở nhóm này được giới hạn 1 lần / ${cooldownMin} phút để tránh spam._`
    : `\n\n👆 Admin chưa kết nối DM bot — gõ /start trong DM để nhận push duyệt riêng.\n_Nhắc nhở nhóm này được giới hạn 1 lần / ${cooldownMin} phút để tránh spam._`;

  await pushMany(groupTargets, text + startLink, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true,
  });

  // Mark throttle window — best-effort, never block on failure
  const nowIso = new Date().toISOString();
  try {
    // Atomic per-row update so concurrent approvals don't both pass the
    // cooldown gate. We use a single UPDATE with array of IDs.
    const ids = ready.map((g) => g.id);
    const { error: updErr } = await supabase
      .from("telegram_chat_bindings")
      .update({ last_group_fallback_at: nowIso })
      .in("id", ids);
    if (updErr) console.warn("[telegram-notifier] failed to stamp last_group_fallback_at:", updErr);
    // Increment counter individually (no atomic increment in PostgREST without RPC)
    await Promise.allSettled(
      ready.map((g) =>
        supabase
          .from("telegram_chat_bindings")
          .update({ group_fallback_count: (g.group_fallback_count ?? 0) + 1 })
          .eq("id", g.id)
      ),
    );
  } catch (e) {
    console.warn("[telegram-notifier] throttle bookkeeping error:", e);
  }

  if (skipped > 0) {
    console.log(
      `[telegram-notifier] sent group fallback to ${ready.length} binding(s), skipped ${skipped} in cooldown for org ${organizationId}`,
    );
  }
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
// If channel + postUrl provided, surface it as a clickable inline button.
export async function notifyPublishResult(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  userId: string | null,
  contentTitle: string,
  success: boolean,
  errorMessage?: string,
  opts?: { channel?: string; postUrl?: string },
): Promise<void> {
  const targets = userId
    ? [await resolveUserTarget(supabase, organizationId, userId)].filter(Boolean) as PushTarget[]
    : await resolveAdminTargets(supabase, organizationId);
  if (targets.length === 0) return;
  const title = escapeMd(contentTitle.slice(0, 80));
  const channelTag = opts?.channel ? ` _(${escapeMd(opts.channel)})_` : "";
  const text = success
    ? `🚀 Đã đăng *${title}*${channelTag} thành công.`
    : `⚠️ Đăng *${title}*${channelTag} thất bại.${errorMessage ? `\n\n_${escapeMd(errorMessage.slice(0, 200))}_` : ""}`;

  const sendOpts: SendOpts = { parse_mode: "Markdown", disable_web_page_preview: true };
  if (success && opts?.postUrl) {
    sendOpts.reply_markup = {
      inline_keyboard: [[{ text: "🔗 Xem bài đăng", url: opts.postUrl }]],
    };
  }
  await pushMany(targets, text, sendOpts);
}

// =====================================================
// Quota threshold alert (P2)
// =====================================================
// Push to admins when org's monthly pipeline usage crosses 80% or 100%.
// Throttled per binding: only one alert per threshold per billing cycle.
export async function notifyQuotaThreshold(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  threshold: 80 | 100,
  used: number,
  limit: number,
  periodStartIso: string,
): Promise<void> {
  const botToken = await getOrgBotToken(supabase, organizationId);
  if (!botToken) return;

  // Find admin DM bindings that haven't been alerted at this threshold this period
  const { data: admins } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"]);
  const adminIds = (admins ?? []).map((m: { user_id: string }) => m.user_id);
  if (adminIds.length === 0) return;

  const { data: bindings } = await supabase
    .from("telegram_chat_bindings")
    .select("id, telegram_chat_id, last_quota_alert_at, last_quota_alert_threshold")
    .eq("organization_id", organizationId)
    .eq("chat_type", "private")
    .eq("is_active", true)
    .in("user_id", adminIds);

  const eligible = (bindings ?? []).filter((b: any) => {
    // Not alerted this billing period at >= this threshold
    if (!b.last_quota_alert_at) return true;
    if (new Date(b.last_quota_alert_at) < new Date(periodStartIso)) return true;
    return (b.last_quota_alert_threshold ?? 0) < threshold;
  });
  if (eligible.length === 0) return;

  const remaining = Math.max(0, limit - used);
  const text = threshold === 100
    ? `🚨 *Đã hết quota tháng này* (${used}/${limit}).\n\nUpgrade gói để tiếp tục dùng AI Agent.`
    : `⚠️ *Sắp hết quota* — đã dùng ${used}/${limit} (${Math.round((used/limit)*100)}%).\n\nCòn ${remaining} lượt. Cân nhắc upgrade gói.`;

  const targets: PushTarget[] = eligible.map((b: any) => ({
    chatId: Number(b.telegram_chat_id),
    botToken,
  }));

  await pushMany(targets, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "💎 Upgrade plan", url: "https://app.flowa.one/settings/billing" }]],
    },
  });

  // Mark as alerted
  const nowIso = new Date().toISOString();
  await supabase
    .from("telegram_chat_bindings")
    .update({ last_quota_alert_at: nowIso, last_quota_alert_threshold: threshold })
    .in("id", eligible.map((b: any) => b.id));
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

// Edit only the inline keyboard of an existing message (no text change).
// Used by the brand switcher to re-render check marks after a tap.
export async function editMessageReplyMarkup(
  botToken: string,
  chatId: number,
  messageId: number,
  replyMarkup: unknown,
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup,
      }),
    });
  } catch (e) {
    console.warn("[telegram-notifier] editMessageReplyMarkup failed:", e);
  }
}
