import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import {
  assertCanCreateGoal,
  resolveBotConfig,
  sendChatAction,
  sendMessage,
  verifyLinkToken,
  buildWelcomeKeyboard,
  buildHelpKeyboard,
  buildContextualHints,
  signLinkToken,
} from "../_shared/telegram-client.ts";

const MINI_APP_URL = Deno.env.get("TELEGRAM_MINIAPP_URL") || "https://app.flowa.one/telegram-app";
import { classifyIntent, type ChatHistoryItem, type BrandContext } from "../_shared/telegram-intent.ts";
import { answerCallback, editMessageText, escapeMd as escMdNotif, notifyQuotaThreshold } from "../_shared/telegram-notifier.ts";

// Reply keyboard shown after /start, /help — quick access to common actions.
const QUICK_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Status" }, { text: "🎨 Brand" }],
    [{ text: "📋 Campaigns" }, { text: "💡 Help" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Per-user free-chat rate limit (in-memory, per edge instance)
// 20 messages / hour per Telegram user. Slash commands are NOT counted.
const FREE_CHAT_LIMIT = 20;
const FREE_CHAT_WINDOW_MS = 60 * 60 * 1000;
const freeChatHits = new Map<number, { count: number; resetAt: number }>();
function checkFreeChatRate(telegramUserId: number): { allowed: boolean; resetMins: number } {
  const now = Date.now();
  const entry = freeChatHits.get(telegramUserId);
  if (!entry || entry.resetAt < now) {
    freeChatHits.set(telegramUserId, { count: 1, resetAt: now + FREE_CHAT_WINDOW_MS });
    return { allowed: true, resetMins: 60 };
  }
  entry.count += 1;
  const resetMins = Math.max(1, Math.ceil((entry.resetAt - now) / 60000));
  return { allowed: entry.count <= FREE_CHAT_LIMIT, resetMins };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

// deno-lint-ignore no-explicit-any
type TelegramUpdate = any;

// In-memory dedup of Telegram update_id (fast path before DB roundtrip).
// DB-level idempotency in `telegram_processed_updates` is the source of truth.
const RECENT_UPDATES = new Set<number>();
const RECENT_UPDATES_MAX = 500;
function isDuplicateUpdateMem(updateId: number): boolean {
  if (RECENT_UPDATES.has(updateId)) return true;
  RECENT_UPDATES.add(updateId);
  if (RECENT_UPDATES.size > RECENT_UPDATES_MAX) {
    const first = RECENT_UPDATES.values().next().value;
    if (first !== undefined) RECENT_UPDATES.delete(first);
  }
  return false;
}

// DB-level idempotency: returns true if INSERT collided (already processed).
// deno-lint-ignore no-explicit-any
async function markUpdateProcessed(supabase: any, updateId: number, botConfigId: string, chatId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("telegram_processed_updates")
      .insert({ update_id: updateId, bot_config_id: botConfigId, chat_id: chatId });
    if (!error) return false; // inserted = first time
    // PostgREST unique-violation = 23505
    // deno-lint-ignore no-explicit-any
    if ((error as any).code === "23505") return true;
    console.warn("[telegram-webhook] markUpdateProcessed insert error:", error);
    return false; // fail open — process it (memory dedup still helps within 500 recent IDs)
  } catch (e) {
    console.warn("[telegram-webhook] markUpdateProcessed exception:", e);
    return false;
  }
}

// Standardized error wrapper for command handlers — never let an exception
// bubble up silently. Always reply to the user with a friendly trace ID.
async function safeReply(
  botToken: string,
  chatId: number,
  traceId: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[telegram-webhook] handler error trace=${traceId}:`, msg, e);
    try {
      await sendMessage(
        botToken,
        chatId,
        `⚠️ Có lỗi rồi, thử lại sau nhé. (mã: ${traceId.slice(0, 8)})`,
      );
    } catch (_) { /* swallow */ }
  }
}

// Group mention filter — in group/supergroup, only respond when:
//  - message is a slash command (`/...`), OR
//  - bot is @mentioned in entities, OR
//  - message is a reply to a bot message.
// deno-lint-ignore no-explicit-any
function shouldRespondInGroup(message: any, botUsername: string): boolean {
  const text: string = (message.text || "").trim();
  if (text.startsWith("/")) return true;

  const entities: Array<{ type: string; offset: number; length: number }> = message.entities || [];
  const botTag = `@${botUsername}`.toLowerCase();
  for (const ent of entities) {
    if (ent.type === "mention") {
      const mention = text.slice(ent.offset, ent.offset + ent.length).toLowerCase();
      if (mention === botTag) return true;
    }
  }

  const repliedTo = message.reply_to_message;
  if (repliedTo?.from?.username && repliedTo.from.username.toLowerCase() === botUsername.toLowerCase()) {
    return true;
  }
  return false;
}

Deno.serve(withPerf({ functionName: "telegram-webhook" }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 to Telegram once we've processed (to avoid retry storms),
  // but validate aggressively before any state change.
  try {
    // 1. Global header backstop
    const globalSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (globalSecret && headerSecret !== globalSecret) {
      console.warn("[telegram-webhook] bad secret header");
      return new Response("forbidden", { status: 403 });
    }

    // 2. Per-org webhook secret from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const pathSecret = pathParts[pathParts.length - 1];
    if (!pathSecret || pathSecret === "telegram-webhook") {
      return new Response("missing path secret", { status: 404 });
    }

    const supabase = getServiceClient();
    const botConfig = await resolveBotConfig(supabase, pathSecret);
    if (!botConfig) {
      return new Response("unknown bot", { status: 404 });
    }

    const update: TelegramUpdate = await req.json();

    // Idempotency — fast in-memory check, then DB check
    if (typeof update.update_id === "number") {
      if (isDuplicateUpdateMem(update.update_id)) {
        console.log("[telegram-webhook] duplicate update_id (mem) skipped:", update.update_id);
        return okResponse();
      }
      const cbChatId = update.callback_query?.message?.chat?.id ?? update.message?.chat?.id ?? 0;
      const isDup = await markUpdateProcessed(supabase, update.update_id, botConfig.id, Number(cbChatId) || 0);
      if (isDup) {
        console.log("[telegram-webhook] duplicate update_id (db) skipped:", update.update_id);
        return okResponse();
      }
    }

    const traceId = crypto.randomUUID();

    if (update.callback_query) {
      await safeReply(
        botConfig.botToken,
        update.callback_query.message?.chat?.id ?? 0,
        traceId,
        () => handleCallbackQuery({ supabase, botConfig, callback: update.callback_query }),
      );
      return okResponse();
    }

    const message = update.message;
    if (!message) {
      console.log("[telegram-webhook] non-message update skipped:", {
        update_id: update.update_id,
        keys: Object.keys(update),
      });
      return okResponse();
    }

    const chatId: number = message.chat.id;
    const chatType: string = message.chat.type;
    const telegramUserId: number | undefined = message.from?.id;
    const telegramUsername: string | undefined = message.from?.username;

    // Group mention filter — in groups only respond to commands or @mentions/replies
    if (chatType === "group" || chatType === "supergroup") {
      if (!shouldRespondInGroup(message, botConfig.botUsername)) {
        return okResponse();
      }
    }

    if (typeof message.text !== "string") {
      const contentType = message.sticker ? "sticker"
        : message.photo ? "photo"
        : message.voice ? "voice"
        : message.document ? "document"
        : message.video ? "video"
        : "unknown";
      console.log("[telegram-webhook] non-text message:", {
        update_id: update.update_id,
        chatType, contentType, org: botConfig.organizationId,
      });
      if (chatType === "private") {
        await sendMessage(
          botConfig.botToken, chatId,
          "🤖 Hiện bot chỉ hiểu tin nhắn text. Gõ /help để xem các lệnh có sẵn.",
        );
      }
      return okResponse();
    }

    let text: string = message.text.trim();
    // Strip leading "@botusername" prefix in groups
    const botTag = `@${botConfig.botUsername}`;
    if (text.toLowerCase().startsWith(botTag.toLowerCase())) {
      text = text.slice(botTag.length).trim();
    }
    const [rawCommand, ...argParts] = text.split(/\s+/);
    // Strip "@botusername" suffix on commands (e.g. "/status@flowabot")
    const command = rawCommand.split("@")[0];
    const args = argParts.join(" ");

    console.log("[telegram-webhook] message:", {
      update_id: update.update_id, trace: traceId,
      chatType, command, argsLength: args.length,
      org: botConfig.organizationId, bot: botConfig.botUsername,
    });

    let normalizedCommand = command;
    if (text === "📊 Status") normalizedCommand = "/status";
    else if (text === "🎨 Brand") normalizedCommand = "/brand";
    else if (text === "📋 Campaigns") normalizedCommand = "/campaigns";
    else if (text === "💡 Help") normalizedCommand = "/help";

    switch (normalizedCommand) {
      case "/start":
        await safeReply(botConfig.botToken, chatId, traceId, () => handleStart({
          supabase, botConfig, chatId, chatType, telegramUserId, telegramUsername, token: args,
        }));
        break;
      case "/help":
        await safeReply(botConfig.botToken, chatId, traceId, () => sendMessage(
          botConfig.botToken, chatId, helpText(),
          { reply_markup: chatType === "private" ? QUICK_KEYBOARD : undefined },
        ));
        break;
      case "/status":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleStatus({ supabase, botConfig, chatId }));
        break;
      case "/campaigns":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleCampaigns({ supabase, botConfig, chatId, telegramUserId }));
        break;
      case "/generate":
        if (chatType !== "private") {
          await sendMessage(botConfig.botToken, chatId,
            "⚠️ Lệnh /generate chỉ dùng trong DM với bot để tránh spam quota.");
          break;
        }
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleGenerate({ supabase, botConfig, chatId, telegramUserId, prompt: args }));
        break;
      case "/cancel":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleCancel({ supabase, botConfig, chatId, telegramUserId }));
        break;
      case "/link_group":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleLinkGroup({ supabase, botConfig, chatId, chatType, telegramUserId }));
        break;
      case "/brand":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleBrand({ supabase, botConfig, chatId, telegramUserId, arg: args }));
        break;
      case "/examples":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleExamples({ supabase, botConfig, chatId }));
        break;
      case "/tutorial":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleTutorial({ supabase, botConfig, chatId, telegramUserId, step: 1 }));
        break;
      case "/settings":
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          handleSettings({ supabase, botConfig, chatId, telegramUserId }));
        break;
      default:
        if (text.startsWith("/")) {
          if (chatType === "private") {
            await sendMessage(botConfig.botToken, chatId,
              "Lệnh không hợp lệ. Gõ /help để xem hướng dẫn.",
              { reply_markup: { inline_keyboard: buildHelpKeyboard() } });
          }
          break;
        }
        if (chatType === "private") {
          await safeReply(botConfig.botToken, chatId, traceId, () =>
            handleFreeChat({ supabase, botConfig, chatId, telegramUserId, text }));
        }
    }

    await supabase
      .from("telegram_chat_bindings")
      .update({ last_command_at: new Date().toISOString() })
      .eq("organization_id", botConfig.organizationId)
      .eq("telegram_chat_id", chatId);

    return okResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[telegram-webhook] Error:", message);
    return new Response("ok", { status: 200 });
  }
}));

function okResponse(): Response {
  return new Response("ok", {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

function helpText(): string {
  return [
    "📋 Lệnh hỗ trợ:",
    "/start <token> — Kết nối tài khoản (lấy token từ app Flowa)",
    "/generate <mô tả> — Tạo campaign mới (cần quyền can_create_goals)",
    "/status — Xem quota pipeline tháng này",
    "/campaigns — Xem 5 campaign mới nhất",
    "/brand [tên] — Xem hoặc đổi brand đang active cho phiên chat",
    "/link_group — (Admin, trong group) Kết nối group với tổ chức",
    "/help — Hiện danh sách này",
    "",
    "💬 Hoặc chat tự nhiên — bot hiểu tiếng Việt!",
  ].join("\n");
}

interface HandlerCtx {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: {
    id: string;
    organizationId: string;
    botUsername: string;
    botToken: string;
    defaultAutonomyLevel: string;
  };
  chatId: number;
}

async function handleStart(
  ctx: HandlerCtx & {
    chatType: string;
    telegramUserId?: number;
    telegramUsername?: string;
    token: string;
  },
): Promise<void> {
  const { supabase, botConfig, chatId, chatType, telegramUserId, telegramUsername, token } = ctx;

  if (!token) {
    console.log("[telegram-webhook] /start without token", {
      organizationId: botConfig.organizationId,
      chatId,
      chatType,
      telegramUserId,
    });

    // Check if this chat is already linked → friendly welcome back
    const { data: existing } = await supabase
      .from("telegram_chat_bindings")
      .select("user_id, telegram_username")
      .eq("organization_id", botConfig.organizationId)
      .eq("telegram_chat_id", chatId)
      .eq("is_active", true)
      .maybeSingle();

    if (existing?.user_id) {
      const who = existing.telegram_username ? `@${existing.telegram_username}` : "bạn";
      await sendMessage(
        botConfig.botToken,
        chatId,
        `👋 Chào ${who}! Tài khoản đã được kết nối với Flowa.\n\n💬 Cứ chat tự nhiên — ví dụ: "tạo campaign cho spa làm đẹp", "quota tháng này còn bao nhiêu?"\n\nGõ /help để xem tất cả lệnh.`,
        { reply_markup: chatType === "private" ? QUICK_KEYBOARD : undefined },
      );
      return;
    }

    // Not linked yet → specific instructions
    await sendMessage(
      botConfig.botToken,
      chatId,
      [
        "👋 Chào mừng đến với Flowa Bot!",
        "",
        "🔗 *Để kết nối tài khoản:*",
        "1. Mở app Flowa: https://app.flowa.one",
        "2. Vào *Agent → Telegram*",
        "3. Bấm *Tạo link kết nối* → mở link hoặc scan QR",
        "",
        "Sau khi link xong, bạn có thể chat tự nhiên với bot ngay.",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }

  let payload;
  try {
    payload = await verifyLinkToken(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid";
    console.warn("[telegram-webhook] invalid /start token", {
      organizationId: botConfig.organizationId,
      chatId,
      tokenLength: token.length,
      error: msg,
    });
    await sendMessage(
      botConfig.botToken,
      chatId,
      `❌ Link không hợp lệ hoặc đã hết hạn (${msg}). Quay lại app để lấy link mới.`,
    );
    return;
  }

  if (payload.org !== botConfig.organizationId) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Token không thuộc tổ chức của bot này.",
    );
    return;
  }

  const bindingChatType = chatType === "private" ? "private" : chatType;

  const { error } = await supabase
    .from("telegram_chat_bindings")
    .upsert({
      organization_id: botConfig.organizationId,
      user_id: payload.uid,
      telegram_chat_id: chatId,
      chat_type: bindingChatType,
      telegram_user_id: telegramUserId ?? null,
      telegram_username: telegramUsername ?? null,
      is_active: true,
      linked_at: new Date().toISOString(),
    }, { onConflict: "organization_id,telegram_chat_id" });

  if (error) {
    console.error("[telegram-webhook] upsert binding failed:", error);
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Không lưu được kết nối. Thử lại sau.",
    );
    return;
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    [
      `🎉 Chào ${telegramUsername ? "@" + telegramUsername : "bạn"}! Đã kết nối với Flowa.`,
      "",
      "Mình là *AI Marketing Agent* — tạo content, quản campaign, theo dõi quota từ Telegram.",
      "",
      "👇 Thử ngay:",
    ].join("\n"),
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buildWelcomeKeyboard() },
    },
  );

  // Mark onboarded (best-effort)
  await supabase
    .from("telegram_chat_bindings")
    .update({ onboarded_at: new Date().toISOString(), tutorial_step: 1 })
    .eq("organization_id", botConfig.organizationId)
    .eq("telegram_chat_id", chatId)
    .then(() => {}, () => {});
}

// ===== Helpers cho /status dashboard =====
function escapeMd(s: string): string {
  return (s || "").replace(/([_*\[\]`])/g, "\\$1");
}

function formatProgressBar(used: number, limit: number): string {
  const pct = Math.max(0, Math.min(100, Math.round((used / Math.max(1, limit)) * 100)));
  const filled = Math.round(pct / 10);
  const bar = "▓".repeat(filled) + "░".repeat(10 - filled);
  return `${bar} ${pct}%`;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr).getTime();
  if (!d || Number.isNaN(d)) return "vừa xong";
  const diffMs = Date.now() - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hôm qua";
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  return `${weeks} tuần trước`;
}

function autonomyLabel(level: string): string {
  switch (level) {
    case "full_auto": return "Tự động hoàn toàn";
    case "human_on_loop": return "Bán tự động";
    case "human_in_loop": return "Duyệt từng bước";
    default: return level;
  }
}

function planLabel(plan?: string | null): string {
  if (!plan) return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function formatVnDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function stageLabel(stage?: string | null): string {
  switch (stage) {
    case "strategy": return "Chiến lược";
    case "create": return "Sáng tạo";
    case "quality": return "Chất lượng";
    case "approval": return "Duyệt";
    case "publish": return "Đăng bài";
    case "analyze": return "Phân tích";
    default: return stage || "—";
  }
}

const STAGE_ORDER = ["strategy", "create", "quality", "approval", "publish", "analyze"];
function stageProgressPct(stage?: string | null): number {
  const idx = STAGE_ORDER.indexOf(stage || "");
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

async function handleStatus(ctx: HandlerCtx): Promise<void> {
  const { supabase, botConfig, chatId } = ctx;

  const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId);
  if (!binding) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Chưa kết nối. Mở app Flowa để lấy link /start.",
    );
    return;
  }

  const orgId = botConfig.organizationId;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel fetch — resilient: each piece can fail without breaking others
  const [orgRes, subRes, quotaRes, runningRes, recentRes] = await Promise.allSettled([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_type,current_period_end,status")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .maybeSingle(),
    assertCanCreateGoal(supabase, orgId, binding.userId),
    supabase
      .from("agent_pipelines")
      .select("content_title,current_stage")
      .eq("organization_id", orgId)
      .in("current_stage", ["strategy", "create", "quality", "approval", "publish"])
      .is("completed_at", null)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("agent_pipelines")
      .select("content_title,completed_at")
      .eq("organization_id", orgId)
      .not("completed_at", "is", null)
      .gte("completed_at", sevenDaysAgo)
      .order("completed_at", { ascending: false })
      .limit(3),
  ]);

  const orgName = orgRes.status === "fulfilled" ? (orgRes.value.data?.name as string | undefined) : undefined;
  const sub = subRes.status === "fulfilled" ? subRes.value.data as any : null;
  const quota = quotaRes.status === "fulfilled" ? quotaRes.value : null;
  const running = runningRes.status === "fulfilled" ? (runningRes.value.data as any[] || []) : [];
  const recent = recentRes.status === "fulfilled" ? (recentRes.value.data as any[] || []) : [];

  // Header — month/year
  const now = new Date();
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  const lines: string[] = [];
  lines.push(`📊 *Trạng thái Flowa* — ${monthLabel}`);
  lines.push("");

  // Account section
  lines.push("👤 *Tài khoản*");
  if (orgName) lines.push(`• Tổ chức: ${escapeMd(orgName)}`);
  const planTxt = planLabel(sub?.plan_type);
  const renew = formatVnDate(sub?.current_period_end);
  lines.push(`• Gói: ${escapeMd(planTxt)}${renew ? ` (renew ${renew})` : ""}`);
  if (quota?.ok) {
    lines.push(`• Quyền agent: ${escapeMd(autonomyLabel(quota.maxAutonomyLevel))}`);
  }
  lines.push("");

  // Usage section
  lines.push("📈 *Sử dụng tháng này*");
  if (!quota?.ok) {
    lines.push(`• ${escapeMd(quota?.message || "Không lấy được hạn mức")}`);
  } else if (quota.monthlyLimit === null) {
    lines.push(`• Pipeline: ${quota.pipelinesUsed} · ♾️ Không giới hạn`);
  } else {
    const used = quota.pipelinesUsed;
    const limit = quota.monthlyLimit;
    lines.push(`• Pipeline: ${used}/${limit}  ${formatProgressBar(used, limit)}`);
    const remaining = Math.max(0, limit - used);
    lines.push(`• Còn ${remaining} lượt`);
  }
  lines.push("");

  // Running pipelines
  if (running.length > 0) {
    lines.push(`🚀 *Pipeline đang chạy* (${running.length})`);
    for (const p of running) {
      const title = escapeMd((p.content_title || "Không tên").slice(0, 60));
      const stg = stageLabel(p.current_stage);
      const pct = stageProgressPct(p.current_stage);
      lines.push(`• "${title}" — ${stg} (${pct}%)`);
    }
    lines.push("");
  }

  // Recently completed
  if (recent.length > 0) {
    lines.push(`✅ *Hoàn tất gần đây* (${recent.length} trong 7 ngày)`);
    for (const p of recent) {
      const title = escapeMd((p.content_title || "Không tên").slice(0, 60));
      lines.push(`• "${title}" — ${formatRelativeTime(p.completed_at)}`);
    }
    lines.push("");
  }

  // Hints
  const hints: string[] = [];
  if (quota?.ok && quota.monthlyLimit !== null && quota.monthlyLimit > 0) {
    const pct = (quota.pipelinesUsed / quota.monthlyLimit) * 100;
    if (pct >= 90) {
      hints.push("⚠️ Sắp hết quota tháng này — cân nhắc nâng cấp gói để tiếp tục");
    } else if (pct >= 60) {
      hints.push(`⚠️ Đã dùng ${Math.round(pct)}% quota — cân nhắc upgrade nếu cần thêm`);
    } else if ((sub?.plan_type || "free") === "free") {
      hints.push("💎 Bạn đang dùng gói Free — upgrade để mở khoá thêm tính năng");
    }
  }
  if (running.length === 0) {
    hints.push("👉 /generate <mô tả> để tạo campaign mới");
  }
  if (hints.length > 0) {
    lines.push("💡 *Gợi ý*");
    for (const h of hints) lines.push(h);
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    lines.join("\n").trim(),
    { parse_mode: "Markdown", disable_web_page_preview: true },
  );
}

async function handleGenerate(
  ctx: HandlerCtx & { telegramUserId?: number; prompt: string },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, prompt } = ctx;

  if (!prompt) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Cú pháp: /generate <mô tả campaign>\nVí dụ: /generate viết 3 idea content cho spa làm đẹp",
    );
    return;
  }

  const binding = await lookupUserBinding(
    supabase,
    botConfig.organizationId,
    chatId,
    telegramUserId,
  );
  if (!binding) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Chưa kết nối. Hãy /start trong DM với bot trước (mở app Flowa để lấy link).",
    );
    return;
  }

  const gate = await assertCanCreateGoal(
    supabase,
    botConfig.organizationId,
    binding.userId,
  );
  if (!gate.ok) {
    await sendMessage(botConfig.botToken, chatId, gate.message);
    return;
  }

  const { data: goal, error: goalError } = await supabase
    .from("agent_goals")
    .insert({
      name: prompt.slice(0, 120),
      description: prompt,
      organization_id: botConfig.organizationId,
      created_by: binding.userId,
      target_topics: [],
      target_channels: [],
      frequency: {},
      autonomy_level: botConfig.defaultAutonomyLevel,
      approval_mode: "approve_plan",
      is_active: true,
      is_paused: false,
    })
    .select("id")
    .single();

  if (goalError || !goal) {
    console.error("[telegram-webhook] insert goal failed:", goalError);
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Không tạo được goal. Thử lại sau.",
    );
    return;
  }

  // Fire-and-forget trigger pipeline
  triggerPipeline(goal.id, botConfig.organizationId).catch((err) => {
    console.error("[telegram-webhook] pipeline trigger failed:", err);
  });

  // Log execution
  await supabase.from("agent_execution_logs").insert({
    session_id: crypto.randomUUID(),
    agent_name: "telegram-bot",
    status: "completed",
    input_summary: `Telegram /generate: ${prompt.slice(0, 200)}`,
    output_summary: `Created goal ${goal.id} from chat ${chatId} by user ${binding.userId}`,
  });

  await sendMessage(
    botConfig.botToken,
    chatId,
    `✅ Pipeline đã khởi chạy.\nGoal: ${goal.id}\nDùng /status để theo dõi.`,
  );

  // P2: Check quota threshold AFTER creating goal — push alert if crossed 80%/100%
  try {
    const post = await assertCanCreateGoal(supabase, botConfig.organizationId, binding.userId);
    if (post.ok && post.monthlyLimit && post.monthlyLimit > 0) {
      const pct = (post.pipelinesUsed / post.monthlyLimit) * 100;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("current_period_start")
        .eq("organization_id", botConfig.organizationId)
        .eq("status", "active")
        .maybeSingle();
      const periodStart = sub?.current_period_start || new Date(0).toISOString();

      if (pct >= 100) {
        await notifyQuotaThreshold(supabase, botConfig.organizationId, 100, post.pipelinesUsed, post.monthlyLimit, periodStart);
      } else if (pct >= 80) {
        await notifyQuotaThreshold(supabase, botConfig.organizationId, 80, post.pipelinesUsed, post.monthlyLimit, periodStart);
      }
    }
  } catch (qErr) {
    console.warn("[telegram-webhook] quota alert check failed:", qErr);
  }
}

async function handleLinkGroup(
  ctx: HandlerCtx & { chatType: string; telegramUserId?: number },
): Promise<void> {
  const { supabase, botConfig, chatId, chatType, telegramUserId } = ctx;

  if (chatType !== "group" && chatType !== "supergroup") {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Lệnh này chỉ dùng được trong group chat.",
    );
    return;
  }

  if (!telegramUserId) {
    await sendMessage(botConfig.botToken, chatId, "Không xác định được user.");
    return;
  }

  // Resolve the caller via their DM binding to the same org
  const { data: dmBinding, error: dmError } = await supabase
    .from("telegram_chat_bindings")
    .select("user_id")
    .eq("organization_id", botConfig.organizationId)
    .eq("telegram_user_id", telegramUserId)
    .eq("chat_type", "private")
    .maybeSingle();

  if (dmError) throw dmError;
  if (!dmBinding?.user_id) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Bạn cần /start với bot trong DM trước.",
    );
    return;
  }

  // Check admin
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", botConfig.organizationId)
    .eq("user_id", dmBinding.user_id)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member || !["owner", "admin"].includes(member.role)) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Chỉ admin tổ chức mới link được group.",
    );
    return;
  }

  const { error: insertError } = await supabase
    .from("telegram_chat_bindings")
    .upsert({
      organization_id: botConfig.organizationId,
      user_id: null,
      telegram_chat_id: chatId,
      chat_type: chatType,
      telegram_user_id: null,
      telegram_username: null,
      is_active: true,
      linked_at: new Date().toISOString(),
    }, { onConflict: "organization_id,telegram_chat_id" });

  if (insertError) {
    console.error("[telegram-webhook] link_group upsert failed:", insertError);
    await sendMessage(botConfig.botToken, chatId, "❌ Không lưu được.");
    return;
  }

  await supabase
    .from("telegram_bot_configs")
    .update({ group_chat_id: chatId })
    .eq("id", botConfig.id);

  await sendMessage(
    botConfig.botToken,
    chatId,
    "✅ Group đã được link. Thành viên đã /start DM có thể /generate từ group này.",
  );
}

// =====================================================
// Helpers
// =====================================================
async function lookupUserBinding(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
  telegramUserId?: number,
): Promise<{ userId: string } | null> {
  const { data: binding, error } = await supabase
    .from("telegram_chat_bindings")
    .select("user_id, chat_type")
    .eq("organization_id", organizationId)
    .eq("telegram_chat_id", chatId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  // Private chat: use the user directly
  if (binding?.user_id && binding.chat_type === "private") {
    return { userId: binding.user_id };
  }

  // Group chat: need to resolve the calling Telegram user -> app user via their DM binding
  if (binding && !binding.user_id && telegramUserId) {
    const { data: dm, error: dmError } = await supabase
      .from("telegram_chat_bindings")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("telegram_user_id", telegramUserId)
      .eq("chat_type", "private")
      .maybeSingle();
    if (dmError) throw dmError;
    if (dm?.user_id) return { userId: dm.user_id };
  }

  return null;
}

async function triggerPipeline(
  goalId: string,
  organizationId: string,
): Promise<void> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-pipeline`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      action: "trigger_from_goal",
      goal_id: goalId,
      organization_id: organizationId,
    }),
  });
}

// =====================================================
// Free chat (natural language, no slash command)
// =====================================================
async function handleFreeChat(
  ctx: HandlerCtx & { telegramUserId?: number; text: string },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, text } = ctx;

  // 0. Per-user rate limit (free chat only — slash commands not counted)
  if (telegramUserId) {
    const rate = checkFreeChatRate(telegramUserId);
    if (!rate.allowed) {
      await sendMessage(
        botConfig.botToken,
        chatId,
        `⏳ Bạn đã đạt giới hạn ${FREE_CHAT_LIMIT} tin chat AI/giờ. Thử lại sau ~${rate.resetMins} phút, hoặc dùng lệnh /generate, /status, /help (không bị giới hạn).`,
      );
      return;
    }
  }

  // 0b. Resolve active brand for this user (if linked + chosen)
  const brandCtx = await getActiveBrandContext(supabase, botConfig.organizationId, chatId);

  // 0c. First-time brand hint — nudge user to /brand if they haven't picked one yet.
  // Shown at most once per binding (tracked via first_chat_hint_shown_at).
  await maybeShowBrandHint(supabase, botConfig, chatId, brandCtx);

  // 1. Log user message (best-effort)
  await supabase.from("telegram_messages_log").insert({
    organization_id: botConfig.organizationId,
    chat_id: chatId,
    role: "user",
    content: text.slice(0, 2000),
  }).then(() => {}, (e: unknown) => console.warn("[free-chat] log user failed:", e));

  // 2. Fetch last 6 messages for context
  const { data: rawHistory } = await supabase
    .from("telegram_messages_log")
    .select("role, content")
    .eq("organization_id", botConfig.organizationId)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(7); // 6 prior + current we just inserted

  const history: ChatHistoryItem[] = (rawHistory ?? [])
    .reverse()
    .slice(0, -1) // drop the message we just inserted (it's also the input)
    .map((r: { role: string; content: string }) => ({
      role: r.role === "assistant" ? "assistant" : "user",
      content: r.content,
    }));

  // 3. Typing indicator
  await sendChatAction(botConfig.botToken, chatId, "typing");

  // 4. Classify (with org context for AI provider routing)
  const result = await classifyIntent(text, history, botConfig.organizationId, brandCtx);
  console.log(
    "[free-chat] intent:", result.intent,
    "org:", botConfig.organizationId,
    "error:", result.error ?? "none",
  );

  // 5. Route
  let assistantReply = "";

  // If classifier failed (e.g. AI gateway 402), send friendly fallback
  // instead of the generic chitchat reply, and surface slash commands.
  if (result.error) {
    const errMsg = result.error === "credits_exhausted"
      ? "🤖 Bot AI đang tạm quá tải, thử lại sau ít phút nhé.\n\nTrong lúc chờ, bạn có thể dùng lệnh:\n• `/generate <mô tả campaign>` — tạo campaign\n• `/status` — xem hạn mức\n• `/help` — danh sách lệnh"
      : "🤖 Mình gặp trục trặc nhỏ khi xử lý tin nhắn. Thử lại nhé, hoặc dùng `/generate <mô tả>` / `/status` / `/help`.";
    await sendMessage(botConfig.botToken, chatId, errMsg);
    assistantReply = errMsg;
  } else {
    switch (result.intent) {
      case "generate_campaign": {
        const prompt = result.prompt?.trim() || text;
        // Reuse existing handleGenerate (sends its own confirmation messages)
        await handleGenerate({
          supabase,
          botConfig,
          chatId,
          telegramUserId,
          prompt,
        });
        assistantReply = `[generate_campaign] ${prompt.slice(0, 200)}`;
        break;
      }
      case "status": {
        await handleStatus({ supabase, botConfig, chatId });
        assistantReply = "[status]";
        break;
      }
      case "help": {
        await sendMessage(botConfig.botToken, chatId, helpText());
        assistantReply = "[help]";
        break;
      }
      case "chitchat":
      default: {
        const reply = result.reply?.trim() ||
          "Mình ở đây 👋 Bạn cần mình giúp gì với marketing hôm nay?";
        await sendMessage(botConfig.botToken, chatId, reply);
        assistantReply = reply;
      }
    }
  }

  // 6. Log assistant reply
  await supabase.from("telegram_messages_log").insert({
    organization_id: botConfig.organizationId,
    chat_id: chatId,
    role: "assistant",
    content: assistantReply.slice(0, 2000),
    intent: result.intent,
  }).then(() => {}, (e: unknown) => console.warn("[free-chat] log assistant failed:", e));
}

// =====================================================
// /brand command — list brands or set active one
// =====================================================
async function handleBrand(
  ctx: HandlerCtx & { telegramUserId?: number; arg: string },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, arg } = ctx;

  const binding = await lookupUserBinding(
    supabase,
    botConfig.organizationId,
    chatId,
    telegramUserId,
  );
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId, "Chưa kết nối. /start trong DM trước.");
    return;
  }

  const { data: brands } = await supabase
    .from("brand_templates")
    .select("id, brand_name, is_default")
    .eq("organization_id", botConfig.organizationId)
    .order("is_default", { ascending: false })
    .order("brand_name", { ascending: true })
    .limit(20);

  if (!brands || brands.length === 0) {
    await sendMessage(botConfig.botToken, chatId, "Tổ chức chưa có brand nào. Tạo trong app Flowa trước.");
    return;
  }

  // No arg → show current + list
  if (!arg) {
    const { data: current } = await supabase
      .from("telegram_chat_bindings")
      .select("active_brand_template_id, brand_templates:active_brand_template_id(brand_name)")
      .eq("organization_id", botConfig.organizationId)
      .eq("telegram_chat_id", chatId)
      .maybeSingle();
    const currentName = (current as any)?.brand_templates?.brand_name as string | undefined;

    const lines: string[] = [];
    lines.push(`🎨 *Brand đang active:* ${currentName ? escMdNotif(currentName) : "_chưa chọn_"}`);
    lines.push("");
    lines.push("*Chọn brand bằng:* `/brand <tên>`");
    lines.push("");
    lines.push("*Brand trong tổ chức:*");
    for (const b of brands) {
      lines.push(`• ${escMdNotif(b.brand_name)}${b.is_default ? " _(mặc định)_" : ""}`);
    }
    await sendMessage(botConfig.botToken, chatId, lines.join("\n"), { parse_mode: "Markdown" });
    return;
  }

  // arg → fuzzy match brand name
  const needle = arg.toLowerCase();
  const matched = brands.find((b: any) => b.brand_name.toLowerCase() === needle)
    || brands.find((b: any) => b.brand_name.toLowerCase().includes(needle));
  if (!matched) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      `❌ Không tìm thấy brand "${arg}". Gõ /brand để xem danh sách.`,
    );
    return;
  }

  const { error } = await supabase
    .from("telegram_chat_bindings")
    .update({ active_brand_template_id: matched.id })
    .eq("organization_id", botConfig.organizationId)
    .eq("telegram_chat_id", chatId);
  if (error) {
    console.error("[telegram-webhook] set active brand failed:", error);
    await sendMessage(botConfig.botToken, chatId, "❌ Không lưu được. Thử lại sau.");
    return;
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    `✅ Đã chọn brand *${escMdNotif(matched.brand_name)}* cho phiên chat.`,
    { parse_mode: "Markdown" },
  );
}

// Resolve active brand → BrandContext (for free chat).
async function getActiveBrandContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
): Promise<BrandContext | null> {
  try {
    const { data: binding } = await supabase
      .from("telegram_chat_bindings")
      .select("active_brand_template_id")
      .eq("organization_id", organizationId)
      .eq("telegram_chat_id", chatId)
      .maybeSingle();
    let brandId = binding?.active_brand_template_id as string | undefined;

    // Fallback to org default brand if user hasn't picked one
    if (!brandId) {
      const { data: def } = await supabase
        .from("brand_templates")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("is_default", true)
        .maybeSingle();
      brandId = def?.id;
    }
    if (!brandId) return null;

    const { data: brand } = await supabase
      .from("brand_templates")
      .select("brand_name, industry, tone_of_voice, unique_value_proposition")
      .eq("id", brandId)
      .maybeSingle();
    return (brand as BrandContext) ?? null;
  } catch (e) {
    console.warn("[telegram-webhook] getActiveBrandContext failed:", e);
    return null;
  }
}

// Show a one-time hint about /brand the first time a user free-chats,
// IF they don't have an explicitly chosen brand yet (only org-default fallback).
async function maybeShowBrandHint(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  botConfig: HandlerCtx["botConfig"],
  chatId: number,
  brandCtx: BrandContext | null,
): Promise<void> {
  try {
    const { data: binding } = await supabase
      .from("telegram_chat_bindings")
      .select("active_brand_template_id, first_chat_hint_shown_at")
      .eq("organization_id", botConfig.organizationId)
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (!binding) return;
    if (binding.first_chat_hint_shown_at) return;
    if (binding.active_brand_template_id) return;

    const fallbackName = brandCtx?.brand_name;
    const hint = fallbackName
      ? `💡 *Mẹo:* Bạn đang chat với brand mặc định _${escMdNotif(fallbackName)}_. Dùng \`/brand\` để đổi sang brand khác — AI sẽ trả lời sát giọng brand hơn.`
      : `💡 *Mẹo:* Dùng \`/brand\` để chọn thương hiệu cho phiên chat — AI sẽ hiểu rõ ngành, tone, USP và trả lời sát hơn.`;

    await sendMessage(botConfig.botToken, chatId, hint, { parse_mode: "Markdown" });
    await supabase
      .from("telegram_chat_bindings")
      .update({ first_chat_hint_shown_at: new Date().toISOString() })
      .eq("organization_id", botConfig.organizationId)
      .eq("telegram_chat_id", chatId);
  } catch (e) {
    console.warn("[telegram-webhook] maybeShowBrandHint failed:", e);
  }
}

// =====================================================
// callback_query — inline button taps (approve/reject from push notif)
// =====================================================
async function handleCallbackQuery(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  // deno-lint-ignore no-explicit-any
  callback: any;
}): Promise<void> {
  const { supabase, botConfig, callback } = args;
  const cbId = callback.id as string;
  const data = (callback.data || "") as string;
  const fromTgId = callback.from?.id as number | undefined;
  const msg = callback.message;
  const chatId = msg?.chat?.id as number | undefined;
  const messageId = msg?.message_id as number | undefined;

  // UX callbacks: ux:<group>:<key>
  if (data.startsWith("ux:") && chatId) {
    await handleUxCallback({ supabase, botConfig, chatId, fromTgId, cbId, data });
    return;
  }

  // Format: apv:<a|r>:<approvalId>
  const m = /^apv:([ar]):(.+)$/.exec(data);
  if (!m || !chatId || !fromTgId) {
    await answerCallback(botConfig.botToken, cbId, "Dữ liệu không hợp lệ.");
    return;
  }
  const action = m[1] === "a" ? "approve" : "reject";
  const approvalId = m[2];

  // Resolve calling Telegram user → app user via DM binding
  const { data: dm } = await supabase
    .from("telegram_chat_bindings")
    .select("user_id")
    .eq("organization_id", botConfig.organizationId)
    .eq("telegram_user_id", fromTgId)
    .eq("chat_type", "private")
    .maybeSingle();
  if (!dm?.user_id) {
    await answerCallback(botConfig.botToken, cbId, "Bạn cần /start với bot trước.", true);
    return;
  }

  // Permission check: only owner/admin can approve from Telegram
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", botConfig.organizationId)
    .eq("user_id", dm.user_id)
    .maybeSingle();
  if (!member || !["owner", "admin"].includes(member.role)) {
    await answerCallback(botConfig.botToken, cbId, "Chỉ admin mới duyệt được.", true);
    return;
  }

  // Call agent-approve
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-approve`;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        approval_id: approvalId,
        action,
        reviewer_id: dm.user_id,
        notes: `via Telegram by tg_user=${fromTgId}`,
      }),
    });
    const body = await res.json().catch(() => ({}));

    let toast: string;
    let edited: string;
    if (body?.already_decided) {
      toast = "Đã được xử lý trước đó.";
      edited = `ℹ️ Yêu cầu này đã được ${body.status === "approved" ? "duyệt" : body.status} trước đó.`;
    } else if (body?.success) {
      toast = action === "approve" ? "✅ Đã duyệt" : "❌ Đã từ chối";
      edited = action === "approve"
        ? `✅ *Đã duyệt* — pipeline sẽ chuyển sang publish.`
        : `❌ *Đã từ chối* — pipeline sẽ tạo lại.`;
    } else {
      toast = body?.error || "Có lỗi xảy ra.";
      edited = `⚠️ ${escMdNotif(toast)}`;
    }

    await answerCallback(botConfig.botToken, cbId, toast);
    if (messageId) {
      await editMessageText(botConfig.botToken, chatId, messageId, edited, {
        parse_mode: "Markdown",
      });
    }
  } catch (e) {
    console.error("[telegram-webhook] callback agent-approve failed:", e);
    await answerCallback(botConfig.botToken, cbId, "Lỗi hệ thống, thử lại.", true);
  }
}

// =====================================================
// /campaigns — list 5 most recent campaigns for the org
// =====================================================
async function handleCampaigns(
  ctx: HandlerCtx & { telegramUserId?: number },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId } = ctx;

  const binding = await lookupUserBinding(
    supabase,
    botConfig.organizationId,
    chatId,
    telegramUserId,
  );
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId, "Chưa kết nối. /start trong DM trước.");
    return;
  }

  const { data: campaigns, error } = await supabase
    .from("agent_goals")
    .select("id, name, is_active, is_paused, created_at")
    .eq("organization_id", botConfig.organizationId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[telegram-webhook] /campaigns query failed:", error);
    await sendMessage(botConfig.botToken, chatId, "❌ Không tải được danh sách campaign.");
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "📋 Chưa có campaign nào. Dùng /generate <mô tả> để tạo mới.",
    );
    return;
  }

  // Pipeline counts per goal (last 30d)
  const goalIds = (campaigns as any[]).map((c) => c.id);
  const { data: pipes } = await supabase
    .from("agent_pipelines")
    .select("goal_id, completed_at")
    .in("goal_id", goalIds)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const stats = new Map<string, { running: number; done: number }>();
  for (const p of (pipes ?? []) as any[]) {
    const s = stats.get(p.goal_id) || { running: 0, done: 0 };
    if (p.completed_at) s.done += 1; else s.running += 1;
    stats.set(p.goal_id, s);
  }

  const lines: string[] = [`📋 *5 campaign mới nhất*`, ""];
  const inlineKeyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [];

  for (const c of campaigns as any[]) {
    const status = !c.is_active ? "⏸ Tắt" : c.is_paused ? "⏸ Pause" : "▶️ Active";
    const st = stats.get(c.id);
    const stTxt = st ? ` · ${st.running} chạy / ${st.done} xong (30d)` : "";
    const name = (c.name || "Không tên").slice(0, 40);
    lines.push(`• ${escMdNotif(name)}`);
    lines.push(`  ${status}${stTxt}`);

    inlineKeyboard.push([
      {
        text: `👁 ${name.slice(0, 25)}`,
        url: `https://app.flowa.one/agent/goals/${c.id}`,
      },
    ]);
  }
  lines.push("", "_Dùng /generate <mô tả> để tạo campaign mới._");

  await sendMessage(botConfig.botToken, chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
  });
}

// =====================================================
// /cancel — cancel running pipelines for this user (last 1h)
// =====================================================
async function handleCancel(
  ctx: HandlerCtx & { telegramUserId?: number },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId } = ctx;

  const binding = await lookupUserBinding(
    supabase,
    botConfig.organizationId,
    chatId,
    telegramUserId,
  );
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId, "Chưa kết nối. /start trong DM trước.");
    return;
  }

  // Find pipelines created by this user in the last 1h that haven't completed yet
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: running, error } = await supabase
    .from("agent_pipelines")
    .select("id, content_title, current_stage, pipeline_state")
    .eq("organization_id", botConfig.organizationId)
    .is("completed_at", null)
    .gte("created_at", oneHourAgo)
    .in("current_stage", ["strategy", "create", "quality", "approval"]);

  if (error) {
    console.error("[telegram-webhook] /cancel query failed:", error);
    await sendMessage(botConfig.botToken, chatId, "❌ Không kiểm tra được pipeline.");
    return;
  }

  if (!running || running.length === 0) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "ℹ️ Không có pipeline nào đang chạy trong 1h gần đây.",
    );
    return;
  }

  // Mark cancelled — set flag + completed_at to stop downstream processing
  const ids = (running as any[]).map((p) => p.id);
  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("agent_pipelines")
    .update({
      completed_at: nowIso,
      is_flagged: true,
      flag_reason: "cancelled_by_user_via_telegram",
      updated_at: nowIso,
    })
    .in("id", ids);

  if (updErr) {
    console.error("[telegram-webhook] /cancel update failed:", updErr);
    await sendMessage(botConfig.botToken, chatId, "❌ Không hủy được pipeline. Thử lại sau.");
    return;
  }

  const titles = (running as any[])
    .slice(0, 5)
    .map((p) => `• ${escMdNotif((p.content_title || "Không tên").slice(0, 50))}`)
    .join("\n");

  await sendMessage(
    botConfig.botToken,
    chatId,
    `🚫 *Đã hủy ${ids.length} pipeline đang chạy:*\n\n${titles}`,
    { parse_mode: "Markdown" },
  );
}

