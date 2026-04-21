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
  buildBrandSwitcherKeyboard,
  buildBrandFooterKeyboard,
  appendBrandFooter,
  signLinkToken,
  type BrandLite,
} from "../_shared/telegram-client.ts";

const MINI_APP_URL = Deno.env.get("TELEGRAM_MINIAPP_URL") || "https://app.flowa.one/telegram-app";
import { classifyIntent, type ChatHistoryItem, type BrandContext } from "../_shared/telegram-intent.ts";
import { answerCallback, editMessageText, editMessageReplyMarkup, escapeMd as escMdNotif, notifyQuotaThreshold } from "../_shared/telegram-notifier.ts";

type ActiveBrandContext = BrandContext & { id: string };

// In-memory per-chat brand switcher state (page index + search filter + last switcher message id).
// Edge instance scope; resets on cold start — acceptable for an interactive UI element.
const brandSwitcherState = new Map<number, { page: number; filter?: string; messageId?: number; awaitingSearch?: boolean }>();
function getBrandSwitcherState(chatId: number) {
  let s = brandSwitcherState.get(chatId);
  if (!s) {
    s = { page: 0 };
    brandSwitcherState.set(chatId, s);
  }
  return s;
}

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

    // Default bot rehydrate: sentinel row has organizationId = null.
    // For all messages EXCEPT /start <token> (which carries its own org in payload),
    // we look up telegram_chat_bindings by chat_id to know which org to act as.
    if (botConfig.organizationId === null) {
      // Pre-rehydrate: confirm_link callback chưa có binding → lấy org từ pending_links
      const cbDataPeek = update.callback_query?.data || "";
      const cbChatIdPeek = update.callback_query?.message?.chat?.id;
      if (cbDataPeek.startsWith("confirm_link:") && cbChatIdPeek) {
        const { data: pending } = await supabase
          .from("telegram_pending_links")
          .select("payload_org")
          .eq("telegram_chat_id", cbChatIdPeek)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (pending?.payload_org) {
          console.log("[telegram-webhook] default-bot rehydrate via pending_links", {
            chatId: cbChatIdPeek,
            organization_id: pending.payload_org,
          });
          botConfig.organizationId = pending.payload_org as string;
        }
      }
    }
    if (botConfig.organizationId === null) {
      const msgText: string = (update.message?.text || "").trim();
      // Match only the literal /start command (optionally suffixed @bot, optionally
      // followed by args). "/start_foo" or "/startbar" must NOT skip rehydrate.
      const firstToken = msgText.split(/\s+/)[0] || "";
      const firstCmd = firstToken.split("@")[0];
      const isStartCmd = firstCmd === "/start";
      if (!isStartCmd) {
        const cbChatId = update.callback_query?.message?.chat?.id;
        const msgChatId = update.message?.chat?.id;
        const peekChatId = Number(cbChatId ?? msgChatId ?? 0);
        if (peekChatId) {
          const { data: binding } = await supabase
            .from("telegram_chat_bindings")
            .select("organization_id")
            .eq("telegram_chat_id", peekChatId)
            .eq("is_active", true)
            .maybeSingle();
          if (binding?.organization_id) {
            console.log("[telegram-webhook] default-bot rehydrate", {
              chatId: peekChatId,
              organization_id: binding.organization_id,
            });
            botConfig.organizationId = binding.organization_id as string;
          } else {
            // Not bound — private DM gets onboarding, groups/callback silently ignored
            if (update.message?.chat?.type === "private") {
              await sendMessage(
                botConfig.botToken,
                peekChatId,
                "👋 Chưa kết nối. Mở https://app.flowa.one/agents/telegram → Get started on Telegram để lấy link.",
              );
            }
            return okResponse();
          }
        }
      }
    }

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
      case "/campaign":
      case "/campaign_wizard":
        if (chatType !== "private") {
          await sendMessage(botConfig.botToken, chatId,
            "⚠️ /campaign chỉ dùng trong DM với bot.");
          break;
        }
        await safeReply(botConfig.botToken, chatId, traceId, () =>
          startCampaignWizard({ supabase, botConfig, chatId, telegramUserId, initialPrompt: args }));
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
          // If user just tapped 🔍 in brand switcher, treat next plain message as filter.
          const bs = brandSwitcherState.get(chatId);
          if (bs?.awaitingSearch) {
            bs.awaitingSearch = false;
            bs.filter = text.slice(0, 50);
            bs.page = 0;
            const brands = await fetchOrgBrands(supabase, botConfig.organizationId);
            await renderBrandSwitcher({ supabase, botConfig, chatId, brands });
            break;
          }
          // Wizard description step: if user is mid-wizard awaiting description, capture text.
          const wizState = telegramUserId
            ? await getWizardState(supabase, chatId, telegramUserId)
            : null;
          if (wizState && wizState.flow === "campaign_wizard" && wizState.step === "description") {
            await safeReply(botConfig.botToken, chatId, traceId, () =>
              continueWizardWithDescription({ supabase, botConfig, chatId, telegramUserId: telegramUserId!, description: text }));
            break;
          }
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
    "/generate <mô tả> — Tạo *campaign* nhiều bài (cần quyền can_create_goals)",
    "/status — Xem quota pipeline tháng này",
    "/campaigns — Xem 5 campaign mới nhất",
    "/brand [tên] — Xem hoặc đổi brand đang active cho phiên chat",
    "/link_group — (Admin, trong group) Kết nối group với tổ chức",
    "/help — Hiện danh sách này",
    "",
    "💬 *Hoặc chat tự nhiên — bot hiểu tiếng Việt!*",
    "• Tạo *1 bài lẻ*: _\"viết 1 bài Facebook về spa giảm 30%\"_",
    "• Tạo *campaign*: _\"campaign 2 tuần cho spa, 3 bài/tuần\"_",
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
  const isDefaultBot = botConfig.organizationId === null;

  if (!token) {
    console.log("[telegram-webhook] /start without token", {
      organizationId: botConfig.organizationId,
      chatId,
      chatType,
      telegramUserId,
      isDefaultBot,
    });

    // Check if this chat is already linked → friendly welcome back.
    // For default bot (org=null), search by chat_id alone; partial unique
    // on private chats guarantees at most one active binding.
    let existingQuery = supabase
      .from("telegram_chat_bindings")
      .select("user_id, telegram_username")
      .eq("telegram_chat_id", chatId)
      .eq("is_active", true);
    if (!isDefaultBot) {
      existingQuery = existingQuery.eq("organization_id", botConfig.organizationId);
    }
    const { data: existing } = await existingQuery.maybeSingle();

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
        "👋 *Chào mừng đến với Flowa Bot!*",
        "",
        "Tài khoản Telegram này chưa được kết nối với Flowa.",
        "",
        "🔗 *Cách kết nối (30 giây):*",
        "1. Bấm nút bên dưới để mở app Flowa",
        "2. Đăng nhập (nếu chưa)",
        "3. Bấm *Mở Telegram* — bot tự động link",
        "",
        "_Sau khi link xong, quay lại đây và chat tự nhiên._",
      ].join("\n"),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Mở Flowa để kết nối", url: "https://app.flowa.one/agents/telegram" }],
            [{ text: "❓ Hướng dẫn chi tiết", url: "https://help.flowa.one/telegram" }],
          ],
        },
      },
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

  // BYOB bot: reject tokens for other orgs. Default bot (org=null) accepts any
  // valid token — payload.org IS the target org.
  if (!isDefaultBot && payload.org !== botConfig.organizationId) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Token không thuộc tổ chức của bot này.",
    );
    return;
  }

  const bindingChatType = chatType === "private" ? "private" : chatType;

  // Default-bot collision: partial unique index prevents one private chat from
  // binding to two active orgs. Detect + friendly-error before stashing pending.
  if (isDefaultBot && bindingChatType === "private") {
    const { data: collision } = await supabase
      .from("telegram_chat_bindings")
      .select("organization_id")
      .eq("telegram_chat_id", chatId)
      .eq("is_active", true)
      .maybeSingle();
    if (collision && collision.organization_id !== payload.org) {
      await sendMessage(
        botConfig.botToken,
        chatId,
        "❌ Chat này đã kết nối với một tổ chức khác. Vào app.flowa.one → Agent → Telegram để gỡ trước rồi thử lại.",
      );
      return;
    }
  }

  // Group chats: keep legacy immediate-link behavior (no 2-step UX needed in groups).
  if (bindingChatType !== "private") {
    const { error } = await supabase
      .from("telegram_chat_bindings")
      .upsert({
        organization_id: payload.org,
        user_id: payload.uid,
        telegram_chat_id: chatId,
        chat_type: bindingChatType,
        telegram_user_id: telegramUserId ?? null,
        telegram_username: telegramUsername ?? null,
        is_active: true,
        linked_at: new Date().toISOString(),
      }, { onConflict: "organization_id,telegram_chat_id" });
    if (error) {
      console.error("[telegram-webhook] upsert group binding failed:", error);
      await sendMessage(botConfig.botToken, chatId, "❌ Không lưu được kết nối. Thử lại sau.");
      return;
    }
    await sendMessage(
      botConfig.botToken,
      chatId,
      `🎉 Group đã kết nối với Flowa.`,
      { parse_mode: "Markdown" },
    );
    botConfig.organizationId = payload.org;
    return;
  }

  // Private chat: 2-step Manus-style flow. Stash pending + ask for confirmation.
  const { error: pendingErr } = await supabase
    .from("telegram_pending_links")
    .upsert({
      telegram_chat_id: chatId,
      telegram_user_id: telegramUserId ?? null,
      telegram_username: telegramUsername ?? null,
      token,
      payload_uid: payload.uid,
      payload_org: payload.org,
      expires_at: new Date(payload.exp * 1000).toISOString(),
    }, { onConflict: "telegram_chat_id" });

  if (pendingErr) {
    console.error("[telegram-webhook] stash pending link failed:", pendingErr);
    await sendMessage(
      botConfig.botToken,
      chatId,
      "❌ Không khởi tạo được kết nối. Thử lại sau.",
    );
    return;
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    [
      "👋 *Chào mừng đến với Flowa!*",
      "",
      "Để tiếp tục, bạn cần liên kết tài khoản Telegram với Flowa.",
      "",
      "Bấm nút bên dưới để xác nhận. Link sẽ hết hạn sau 10 phút.",
    ].join("\n"),
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "🔗 Link Account", callback_data: `confirm_link:${chatId}` },
        ]],
      },
    },
  );
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

  // Resolve active brand first — strictly from the current chat binding.
  // /status must NOT silently fall back to org-wide when a brand was explicitly chosen.
  const activeBrandId = await getActiveBrandId(supabase, orgId, chatId, { fallbackToDefault: false });
  const activeBrand = activeBrandId
    ? await getBrandContextById(supabase, orgId, activeBrandId)
    : null;

  console.log("[handleStatus] scope", {
    chatId,
    orgId,
    activeBrandId,
    activeBrandName: activeBrand?.brand_name ?? null,
  });

  // Count goals for this brand (diagnostics + empty-state)
  let brandGoalCount = 0;
  if (activeBrandId) {
    const { count } = await supabase
      .from("agent_goals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("brand_template_id", activeBrandId);
    brandGoalCount = count ?? 0;
  }

  // Build queries — when brand active, filter via inner-join on agent_goals.brand_template_id.
  // This pushes the filter to DB layer, no intermediate goal-id list to drift.
  let runningQ = supabase
    .from("agent_pipelines")
    .select(
      activeBrandId
        ? "content_title,current_stage,agent_goals!inner(brand_template_id)"
        : "content_title,current_stage",
    )
    .eq("organization_id", orgId)
    .in("current_stage", ["strategy", "create", "quality", "approval", "publish"])
    .is("completed_at", null)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (activeBrandId) {
    runningQ = runningQ.eq("agent_goals.brand_template_id", activeBrandId);
  }

  let recentQ = supabase
    .from("agent_pipelines")
    .select(
      activeBrandId
        ? "content_title,completed_at,agent_goals!inner(brand_template_id)"
        : "content_title,completed_at",
    )
    .eq("organization_id", orgId)
    .not("completed_at", "is", null)
    .gte("completed_at", sevenDaysAgo)
    .order("completed_at", { ascending: false })
    .limit(3);
  if (activeBrandId) {
    recentQ = recentQ.eq("agent_goals.brand_template_id", activeBrandId);
  }

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
    runningQ,
    recentQ,
  ]);

  const orgName = orgRes.status === "fulfilled" ? (orgRes.value.data?.name as string | undefined) : undefined;
  const sub = subRes.status === "fulfilled" ? subRes.value.data as any : null;
  const quota = quotaRes.status === "fulfilled" ? quotaRes.value : null;
  const running = runningRes.status === "fulfilled" ? (runningRes.value.data as any[] || []) : [];
  const recent = recentRes.status === "fulfilled" ? (recentRes.value.data as any[] || []) : [];

  if (runningRes.status === "rejected") {
    console.error("[handleStatus] runningQ failed:", runningRes.reason);
  } else if (runningRes.value.error) {
    console.error("[handleStatus] runningQ error:", runningRes.value.error);
  }
  if (recentRes.status === "rejected") {
    console.error("[handleStatus] recentQ failed:", recentRes.reason);
  } else if (recentRes.value.error) {
    console.error("[handleStatus] recentQ error:", recentRes.value.error);
  }

  console.log("[handleStatus] result", {
    activeBrandId,
    brandGoalCount,
    runningCount: running.length,
    recentCount: recent.length,
    usedOrgWide: !activeBrandId,
  });

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
  if (activeBrand?.brand_name) {
    lines.push(`• 🎨 Brand đang xem: ${escapeMd(activeBrand.brand_name)}`);
  }
  lines.push("");

  // Usage section
  lines.push("📈 *Sử dụng tháng này*");
  if (!quota?.ok) {
    lines.push(`• ${escapeMd(quota?.message || "Không lấy được hạn mức")}`);
  } else if (quota.monthlyLimit === null) {
    lines.push(`• Pipeline (toàn org): ${quota.pipelinesUsed} · ♾️ Không giới hạn`);
  } else {
    const used = quota.pipelinesUsed;
    const limit = quota.monthlyLimit;
    lines.push(`• Pipeline (toàn org): ${used}/${limit}  ${formatProgressBar(used, limit)}`);
    const remaining = Math.max(0, limit - used);
    lines.push(`• Còn ${remaining} lượt`);
  }
  lines.push("");

  // Brand active but has no pipeline at all (no goals OR goals exist but no pipelines yet)
  if (activeBrandId && running.length === 0 && recent.length === 0) {
    lines.push(`ℹ️ Brand "${escapeMd(activeBrand?.brand_name || "")}" chưa có pipeline nào.`);
    lines.push("👉 /generate <mô tả> để tạo campaign đầu tiên.");
    lines.push("");
  } else {
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
  if (!activeBrandId) {
    hints.push("💡 Mẹo: dùng /brand để chọn brand → /status sẽ chỉ show pipeline của brand đó");
  }
  if (running.length === 0 && !(activeBrandId && running.length === 0 && recent.length === 0)) {
    hints.push("👉 /generate <mô tả> để tạo campaign mới");
  }
  if (hints.length > 0) {
    lines.push("💡 *Gợi ý*");
    for (const h of hints) lines.push(h);
  }

  // Footer with brand badge + one-tap "Đổi brand" button
  const finalText = appendBrandFooter(lines.join("\n").trim(), activeBrand?.brand_name);
  await sendMessage(
    botConfig.botToken,
    chatId,
    finalText,
    {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: activeBrand?.brand_name ? { inline_keyboard: buildBrandFooterKeyboard() } : undefined,
    },
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

  // Resolve active brand BEFORE goal insert so we can attach brand_template_id
  const activeBrandGen = await getActiveBrandContext(supabase, botConfig.organizationId, chatId);

  // AI-extract campaign params from prompt (channels, duration, frequency).
  // Falls back to safe defaults if LLM fails.
  const availableChannels = await getAvailableChannels(
    supabase,
    botConfig.organizationId,
    (activeBrandGen as any)?.id ?? null,
  );
  const extracted = await extractCampaignParams(prompt, availableChannels);
  console.log("[handleGenerate] AI extract:", extracted);

  const today = new Date();
  const durationDays = extracted.duration_days;
  const endDate = new Date(today.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { data: goal, error: goalError } = await supabase
    .from("agent_goals")
    .insert({
      name: (extracted.suggested_name || prompt).slice(0, 120),
      description: prompt,
      organization_id: botConfig.organizationId,
      created_by: binding.userId,
      target_topics: [],
      target_channels: extracted.channels,
      frequency: { cadence: extracted.cadence, per_week: extracted.per_week },
      campaign_duration_days: durationDays,
      campaign_start_date: today.toISOString().split("T")[0],
      campaign_end_date: endDate.toISOString().split("T")[0],
      brand_template_id: (activeBrandGen as any)?.id || null,
      autonomy_level: botConfig.defaultAutonomyLevel,
      approval_mode: "approve_plan",
      is_active: true,
      is_paused: false,
      clarification_context: { telegram_ai_extracted: extracted },
    })
    .select("id, name")
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

  // Log execution
  await supabase.from("agent_execution_logs").insert({
    session_id: crypto.randomUUID(),
    agent_name: "telegram-bot",
    status: "completed",
    input_summary: `Telegram /generate: ${prompt.slice(0, 200)}`,
    output_summary: `Created goal ${goal.id} from chat ${chatId} by user ${binding.userId}`,
  });

  // Await pipeline trigger with timeout, surface real status
  console.log("[handleGenerate] triggering pipeline for goal", goal.id);
  const editRow = [
    { text: "✏️ Sửa kênh / thời lượng", callback_data: `cw:edit:${goal.id}` },
    { text: "🗑️ Hủy goal", callback_data: `cw:cancel:${goal.id}` },
  ];
  const brandRow = activeBrandGen?.brand_name ? buildBrandFooterKeyboard() : [];
  const footerKb = {
    reply_markup: { inline_keyboard: [editRow, ...brandRow] },
  };

  try {
    // agent-pipeline dispatches strategy in background and returns 202 quickly.
    // Short timeout (6s) only to catch early auth / 402 / 429 / routing errors.
    const r = await Promise.race([
      triggerPipeline(goal.id, botConfig.organizationId),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000)),
    ]) as { success?: boolean; status?: number | string; pipelines_created?: number; error?: string };

    console.log("[handleGenerate] pipeline result:", r);

    const errMsg = (r?.error || "").toLowerCase();
    const statusNum = typeof r?.status === "number" ? r.status : 0;

    if (statusNum === 402 || errMsg.includes("402") || errMsg.includes("credit") || errMsg.includes("payment")) {
      await sendMessage(botConfig.botToken, chatId,
        appendBrandFooter(`🤖 AI đang hết credits. Goal "${goal.name}" đã lưu — admin nạp thêm credit rồi chạy lại bằng /status hoặc Mini App.`, activeBrandGen?.brand_name),
        footerKb);
    } else if (statusNum === 429 || errMsg.includes("429") || errMsg.includes("rate")) {
      await sendMessage(botConfig.botToken, chatId,
        appendBrandFooter(`⏳ AI đang quá tải (rate limit). Goal "${goal.name}" đã lưu — thử lại sau 1-2 phút.`, activeBrandGen?.brand_name),
        footerKb);
    } else if (r?.success === false && r?.error) {
      await sendMessage(botConfig.botToken, chatId,
        appendBrandFooter(`⚠️ Goal "${goal.name}" đã lưu nhưng trigger pipeline lỗi: ${String(r.error).slice(0,120)}. Thử /status sau ít phút.`, activeBrandGen?.brand_name),
        footerKb);
    } else {
      // Happy path: accepted (202) — background job is running
      await sendMessage(
        botConfig.botToken,
        chatId,
        appendBrandFooter(
          `✅ Goal "${goal.name}" đã nhận.\nAI đang dựng kế hoạch & pipeline trong nền (thường 20-60 giây).\nDùng /status sau ~1 phút để xem pipeline đã tạo.`,
          activeBrandGen?.brand_name,
        ),
        footerKb,
      );
    }
  } catch (e) {
    console.error("[handleGenerate] pipeline trigger error:", e);
    const msg = String((e as Error)?.message || e);
    // Timeout = agent-pipeline didn't ack in 6s. Background job may still run; don't claim failure.
    if (msg.includes("timeout")) {
      await sendMessage(
        botConfig.botToken,
        chatId,
        appendBrandFooter(
          `✅ Goal "${goal.name}" đã lưu. Hệ thống đang xử lý nền (phản hồi chậm hơn thường lệ).\nDùng /status sau 1-2 phút để kiểm tra pipeline.`,
          activeBrandGen?.brand_name,
        ),
        footerKb,
      );
    } else {
      await sendMessage(
        botConfig.botToken,
        chatId,
        appendBrandFooter(
          `⚠️ Goal "${goal.name}" đã lưu nhưng chưa khởi chạy được (${msg.slice(0,100)}).\nThử lại sau bằng /status hoặc Mini App.`,
          activeBrandGen?.brand_name,
        ),
        footerKb,
      );
    }
  }

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

// =====================================================
// handleGenerateSingle — tạo NHANH 1 bài cho 1 kênh,
// bypass agent_goals + campaign plan. Gọi thẳng generate-multichannel.
// =====================================================
const VALID_SINGLE_CHANNELS = ["facebook", "instagram", "website", "tiktok", "linkedin", "threads", "x", "zalo"];
const SINGLE_PROMPT_CACHE_IDX = 99; // dedicated slot in telegram_example_cache

async function handleGenerateSingle(
  ctx: HandlerCtx & { telegramUserId?: number; prompt: string; channel: string },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, prompt, channel } = ctx;

  if (!prompt) {
    await sendMessage(botConfig.botToken, chatId,
      "Bạn muốn viết về gì? VD: _viết 1 bài Facebook giới thiệu serum mới_",
      { parse_mode: "Markdown" });
    return;
  }

  const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, telegramUserId);
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId,
      "Chưa kết nối. Hãy /start trong DM với bot trước.");
    return;
  }

  // No valid channel → cache prompt + show channel picker
  if (!channel || !VALID_SINGLE_CHANNELS.includes(channel)) {
    try {
      await supabase.from("telegram_example_cache").delete()
        .eq("chat_id", chatId).eq("idx", SINGLE_PROMPT_CACHE_IDX);
      await supabase.from("telegram_example_cache").insert({
        chat_id: chatId, idx: SINGLE_PROMPT_CACHE_IDX, prompt,
      });
    } catch (e) { console.warn("[handleGenerateSingle] cache prompt failed:", e); }

    await sendMessage(botConfig.botToken, chatId,
      `🤔 *Bạn muốn đăng kênh nào?*\n\n_"${escapeMd(prompt.slice(0, 120))}"_`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📘 Facebook", callback_data: "single:pick:facebook" },
              { text: "📸 Instagram", callback_data: "single:pick:instagram" },
            ],
            [
              { text: "🌐 Website", callback_data: "single:pick:website" },
              { text: "🎵 TikTok", callback_data: "single:pick:tiktok" },
            ],
            [{ text: "❌ Hủy", callback_data: "single:cancel:1" }],
          ],
        },
      });
    return;
  }

  const activeBrand = await getActiveBrandContext(supabase, botConfig.organizationId, chatId);
  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1);

  await sendMessage(botConfig.botToken, chatId,
    appendBrandFooter(`🎯 Đang viết 1 bài cho *${channelLabel}*…\n_Thường mất 20-40 giây_`, activeBrand?.brand_name),
    { parse_mode: "Markdown" });

  // Call generate-multichannel directly (bypass agent_goals)
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-multichannel`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify({
        action: "create",
        topic: prompt,
        channels: [channel],
        organizationId: botConfig.organizationId,
        brandTemplateId: (activeBrand as any)?.id || null,
        userId: binding.userId,
        qualityMode: "balanced",
        agentMode: true,
      }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      const errStr = JSON.stringify(data).toLowerCase();
      if (res.status === 402 || errStr.includes("credit") || errStr.includes("payment")) {
        await sendMessage(botConfig.botToken, chatId,
          `🤖 AI đang hết credits. Thử lại sau khi admin nạp thêm credit.`);
      } else if (res.status === 429 || errStr.includes("rate")) {
        await sendMessage(botConfig.botToken, chatId,
          `⏳ AI đang quá tải. Thử lại sau 1-2 phút.`);
      } else {
        await sendMessage(botConfig.botToken, chatId,
          `⚠️ Tạo bài lỗi: ${String(data?.error || res.statusText).slice(0, 150)}`);
      }
      return;
    }

    const contentId = data?.id || data?.content_id;
    const channelKey = channel === "blog" ? "website_content" : `${channel}_content`;
    const channelText = (data?.[channelKey] || "") as string;
    const preview = channelText.slice(0, 220).trim() + (channelText.length > 220 ? "…" : "");

    const lines: string[] = [
      `✅ *Đã tạo 1 bài cho ${channelLabel}*`,
      "",
      preview ? `_${escapeMd(preview)}_` : "_(Nội dung đã tạo, mở Mini App để xem chi tiết)_",
    ];

    const keyboard: Array<Array<{ text: string; callback_data?: string; web_app?: { url: string }; url?: string }>> = [];
    if (contentId) {
      keyboard.push([{
        text: "📝 Xem & duyệt",
        web_app: { url: `${MINI_APP_URL}#/multichannel/${contentId}` },
      }]);
    }

    await sendMessage(botConfig.botToken, chatId,
      appendBrandFooter(lines.join("\n"), activeBrand?.brand_name),
      {
        parse_mode: "Markdown",
        reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
      });
  } catch (e) {
    console.error("[handleGenerateSingle] error:", e);
    await sendMessage(botConfig.botToken, chatId,
      `⚠️ Có lỗi khi tạo bài: ${String((e as Error)?.message || e).slice(0, 150)}. Thử lại nhé.`);
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
): Promise<{ success: boolean; pipelines_created: number; plan_id?: string; error?: string; status?: number }> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-pipeline`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(url, {
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
    const text = await res.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text }; }
    if (!res.ok) {
      return { success: false, pipelines_created: 0, error: body?.error || text || `HTTP ${res.status}`, status: res.status };
    }
    return {
      success: !!body?.success,
      pipelines_created: Number(body?.pipelines_created || 0),
      plan_id: body?.plan_id,
      error: body?.error,
      status: res.status,
    };
  } catch (e) {
    return { success: false, pipelines_created: 0, error: String((e as Error)?.message || e) };
  }
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

  // 0d. Brand-mismatch detector — if user mentions another brand by name, suggest switch.
  const mismatch = await detectBrandMismatch(supabase, botConfig.organizationId, chatId, text, brandCtx?.brand_name);
  if (mismatch) {
    await sendMessage(
      botConfig.botToken,
      chatId,
      `🤔 Bạn nhắc tới *${escMdNotif(mismatch.mentionedBrand.brand_name)}* nhưng đang dùng brand *${escMdNotif(brandCtx?.brand_name || "(chưa chọn)")}*. Đổi không?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: `✅ Đổi sang ${mismatch.mentionedBrand.brand_name.slice(0, 24)}`, callback_data: `brand:switch:${mismatch.mentionedBrand.id}` },
            { text: "❌ Giữ nguyên", callback_data: "brand:noop" },
          ]],
        },
      },
    );
    return;
  }

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
      case "generate_single": {
        const prompt = result.prompt?.trim() || text;
        const channel = (result.channel || "").toLowerCase().trim();
        await handleGenerateSingle({
          supabase,
          botConfig,
          chatId,
          telegramUserId,
          prompt,
          channel,
        });
        assistantReply = `[generate_single ch=${channel || "?"}] ${prompt.slice(0, 200)}`;
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
        const finalReply = appendBrandFooter(reply, brandCtx?.brand_name);
        await sendMessage(botConfig.botToken, chatId, finalReply, {
          reply_markup: brandCtx?.brand_name ? { inline_keyboard: buildBrandFooterKeyboard() } : undefined,
        });
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
// /brand command — inline-keyboard switcher (one-tap)
//   • No arg → render switcher with all brands
//   • Arg → fuzzy match → switch directly (back-compat with `/brand <name>`)
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

  const allBrands = await fetchOrgBrands(supabase, botConfig.organizationId);
  if (allBrands.length === 0) {
    await sendMessage(botConfig.botToken, chatId, "Tổ chức chưa có brand nào. Tạo trong app Flowa trước.");
    return;
  }

  // Back-compat: `/brand <name>` → switch directly
  if (arg) {
    const matched = matchBrandByName(allBrands, arg);
    if (!matched) {
      await sendMessage(
        botConfig.botToken,
        chatId,
        `❌ Không tìm thấy brand "${arg}". Gõ /brand để xem danh sách.`,
      );
      return;
    }
    await switchActiveBrand(supabase, botConfig.organizationId, chatId, matched.id);
    await sendMessage(
      botConfig.botToken,
      chatId,
      `✅ Đã chọn brand *${escMdNotif(matched.brand_name)}* cho phiên chat.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // No arg → render inline switcher
  await renderBrandSwitcher({ supabase, botConfig, chatId, brands: allBrands, replaceMessageId: undefined });
}

// Helper — fetch brands once, pass around
async function fetchOrgBrands(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
): Promise<BrandLite[]> {
  const { data } = await supabase
    .from("brand_templates")
    .select("id, brand_name, is_default, primary_color")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("brand_name", { ascending: true })
    .limit(50);
  return (data || []) as BrandLite[];
}

function matchBrandByName(brands: BrandLite[], needle: string): BrandLite | undefined {
  const n = needle.trim().toLowerCase();
  if (!n) return undefined;
  return brands.find((b) => b.brand_name.toLowerCase() === n)
    || brands.find((b) => b.brand_name.toLowerCase().includes(n));
}

async function getActiveBrandId(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
  options: { fallbackToDefault?: boolean } = {},
): Promise<string | null> {
  const { fallbackToDefault = true } = options;
  const { data } = await supabase
    .from("telegram_chat_bindings")
    .select("active_brand_template_id")
    .eq("organization_id", organizationId)
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  const activeBrandId = (data?.active_brand_template_id as string | null) ?? null;
  if (activeBrandId || !fallbackToDefault) return activeBrandId;

  const { data: def } = await supabase
    .from("brand_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .is("deleted_at", null)
    .maybeSingle();

  return (def?.id as string | null) ?? null;
}

async function switchActiveBrand(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
  brandId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("telegram_chat_bindings")
    .update({ active_brand_template_id: brandId })
    .eq("organization_id", organizationId)
    .eq("telegram_chat_id", chatId);
  if (error) {
    console.error("[telegram-webhook] switchActiveBrand failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Render (or re-render) the inline brand switcher.
// If `replaceMessageId` is passed → editMessageReplyMarkup (no new message).
async function renderBrandSwitcher(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  brands: BrandLite[];
  replaceMessageId?: number;
}): Promise<void> {
  const { supabase, botConfig, chatId, brands, replaceMessageId } = args;
  const state = getBrandSwitcherState(chatId);

  const filtered = state.filter
    ? brands.filter((b) => b.brand_name.toLowerCase().includes(state.filter!.toLowerCase()))
    : brands;

  const activeId = await getActiveBrandId(supabase, botConfig.organizationId, chatId);
  const keyboard = buildBrandSwitcherKeyboard(filtered, activeId, state.page, {
    webAppUrl: MINI_APP_URL,
    appBaseUrl: "https://app.flowa.one",
  });
  const replyMarkup = { inline_keyboard: keyboard };

  if (replaceMessageId) {
    await editMessageReplyMarkup(botConfig.botToken, chatId, replaceMessageId, replyMarkup);
    return;
  }

  const activeName = activeId ? brands.find((b) => b.id === activeId)?.brand_name : undefined;
  const header = activeName
    ? `🎨 *Brand đang dùng:* ✨ ${escMdNotif(activeName)}`
    : `🎨 *Chưa chọn brand* — chạm để chọn:`;
  const filterLine = state.filter ? `\n_Lọc:_ \`${escMdNotif(state.filter)}\` · gõ /brand để xoá lọc` : "";

  // Send and remember message id so subsequent callbacks can edit in place.
  const sent = await sendMessageReturn(
    botConfig.botToken,
    chatId,
    `${header}${filterLine}\n\nChọn brand khác:`,
    { parse_mode: "Markdown", reply_markup: replyMarkup },
  );
  if (sent?.message_id) {
    state.messageId = sent.message_id;
  }
}

// Variant of sendMessage that returns the Telegram message object so we can later edit it.
async function sendMessageReturn(
  botToken: string,
  chatId: number,
  text: string,
  // deno-lint-ignore no-explicit-any
  opts: any = {},
): Promise<{ message_id: number } | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, ...opts }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      console.warn("[telegram-webhook] sendMessageReturn failed:", res.status, json);
      return null;
    }
    return json.result as { message_id: number };
  } catch (e) {
    console.warn("[telegram-webhook] sendMessageReturn error:", e);
    return null;
  }
}

// Resolve active brand → BrandContext (for free chat).
async function getActiveBrandContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
): Promise<ActiveBrandContext | null> {
  try {
    const brandId = await getActiveBrandId(supabase, organizationId, chatId);
    if (!brandId) return null;
    return await getBrandContextById(supabase, organizationId, brandId);
  } catch (e) {
    console.warn("[telegram-webhook] getActiveBrandContext failed:", e);
    return null;
  }
}

async function getBrandContextById(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  brandId: string,
): Promise<ActiveBrandContext | null> {
  const { data: brand } = await supabase
    .from("brand_templates")
    .select("id, brand_name, industry, tone_of_voice, unique_value_proposition")
    .eq("organization_id", organizationId)
    .eq("id", brandId)
    .is("deleted_at", null)
    .maybeSingle();
  return (brand as ActiveBrandContext) ?? null;
}

// Detect when user mentions a brand name (in free-chat) different from the active brand.
// Returns { mentionedBrand } if a different brand is found, otherwise null.
// Uses simple substring match (case-insensitive, ≥3-char names) to avoid false positives.
async function detectBrandMismatch(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  chatId: number,
  text: string,
  activeBrandName?: string | null,
): Promise<{ mentionedBrand: BrandLite } | null> {
  try {
    const lowerText = text.toLowerCase();
    if (lowerText.length < 4) return null;
    const brands = await fetchOrgBrands(supabase, organizationId);
    if (brands.length < 2) return null;

    // Find brand whose name appears in user text but is NOT the active one
    for (const b of brands) {
      const name = b.brand_name.trim();
      if (name.length < 3) continue;
      if (activeBrandName && name.toLowerCase() === activeBrandName.toLowerCase()) continue;
      // Word-boundary-ish match — require the brand name to appear as a contiguous substring
      if (lowerText.includes(name.toLowerCase())) {
        return { mentionedBrand: b };
      }
    }
    return null;
  } catch (e) {
    console.warn("[telegram-webhook] detectBrandMismatch failed:", e);
    return null;
  }
}
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
  console.log("[telegram-webhook] callback_query:", { data, chatId, fromTgId, messageId });

  // UX callbacks: ux:<group>:<key>
  if (data.startsWith("ux:") && chatId) {
    await handleUxCallback({ supabase, botConfig, chatId, fromTgId, cbId, data });
    return;
  }

  // Brand switcher callbacks: brand:switch:<id> | brand:open | brand:page:<n> | brand:search | brand:noop
  if (data.startsWith("brand:") && chatId) {
    await handleBrandCallback({ supabase, botConfig, chatId, fromTgId, cbId, messageId, data });
    return;
  }

  // Campaign wizard callbacks: cw:<step>:<value>
  if (data.startsWith("cw:") && chatId && fromTgId) {
    await handleCampaignWizardCallback({ supabase, botConfig, chatId, fromTgId, cbId, messageId, data });
    return;
  }

  // 2-step link confirmation (Manus-style): confirm_link:<chatId>
  if (data.startsWith("confirm_link:") && chatId) {
    await handleConfirmLinkCallback({ supabase, botConfig, chatId, fromTgId, cbId, messageId });
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
// 2-step link confirmation handler — Manus-style
// =====================================================
async function handleConfirmLinkCallback(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  fromTgId?: number;
  cbId: string;
  messageId?: number;
}): Promise<void> {
  const { supabase, botConfig, chatId, fromTgId, cbId, messageId } = args;

  const { data: pending, error: lookupErr } = await supabase
    .from("telegram_pending_links")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (lookupErr) {
    console.error("[telegram-webhook] confirm_link lookup failed:", lookupErr);
    await answerCallback(botConfig.botToken, cbId, "Lỗi hệ thống, thử lại.", true);
    return;
  }
  if (!pending) {
    await answerCallback(
      botConfig.botToken,
      cbId,
      "❌ Link đã hết hạn. Quay lại app Flowa để lấy link mới.",
      true,
    );
    if (messageId) {
      await editMessageText(
        botConfig.botToken,
        chatId,
        messageId,
        "⌛ Link kết nối đã hết hạn. Quay lại app Flowa → Agent → Telegram để tạo link mới.",
      );
    }
    return;
  }

  // Anti-spoof: only the same Telegram user who initiated /start can confirm
  if (pending.telegram_user_id && fromTgId && Number(pending.telegram_user_id) !== fromTgId) {
    await answerCallback(
      botConfig.botToken,
      cbId,
      "❌ Chỉ người mở link mới xác nhận được.",
      true,
    );
    return;
  }

  // Re-verify token (defense in depth)
  try {
    await verifyLinkToken(pending.token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid";
    console.warn("[telegram-webhook] confirm_link token invalid:", msg);
    await answerCallback(botConfig.botToken, cbId, "❌ Token không hợp lệ.", true);
    if (messageId) {
      await editMessageText(
        botConfig.botToken,
        chatId,
        messageId,
        `❌ Token không hợp lệ (${msg}). Quay lại app để lấy link mới.`,
      );
    }
    return;
  }

  // Ghost-binding cleanup: same Telegram user previously linked to a different
  // (org, user) pair? Remove those rows so the bot only ever serves one Flowa
  // account per Telegram user. Keeps current user's bindings (e.g. group chats).
  const effectiveTgUserId = pending.telegram_user_id ?? fromTgId ?? null;
  if (effectiveTgUserId) {
    const { error: ghostErr } = await supabase
      .from("telegram_chat_bindings")
      .delete()
      .eq("telegram_user_id", effectiveTgUserId)
      .neq("user_id", pending.payload_uid);
    if (ghostErr) {
      console.warn("[telegram-webhook] ghost binding cleanup failed:", ghostErr);
    }
  }

  const { error: upsertErr } = await supabase
    .from("telegram_chat_bindings")
    .upsert({
      organization_id: pending.payload_org,
      user_id: pending.payload_uid,
      telegram_chat_id: chatId,
      chat_type: "private",
      telegram_user_id: effectiveTgUserId,
      telegram_username: pending.telegram_username ?? null,
      is_active: true,
      linked_at: new Date().toISOString(),
    }, { onConflict: "organization_id,telegram_chat_id" });

  if (upsertErr) {
    console.error("[telegram-webhook] confirm_link upsert failed:", upsertErr);
    await answerCallback(botConfig.botToken, cbId, "❌ Không lưu được kết nối.", true);
    return;
  }

  await supabase
    .from("telegram_pending_links")
    .delete()
    .eq("telegram_chat_id", chatId);

  await supabase
    .from("telegram_chat_bindings")
    .update({ onboarded_at: new Date().toISOString(), tutorial_step: 1 })
    .eq("organization_id", pending.payload_org)
    .eq("telegram_chat_id", chatId)
    .then(() => {}, () => {});

  await answerCallback(botConfig.botToken, cbId, "✅ Đã kết nối!");

  if (messageId) {
    await editMessageText(
      botConfig.botToken,
      chatId,
      messageId,
      "✅ *Đã kết nối thành công với Flowa!*",
      { parse_mode: "Markdown" },
    );
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    [
      `🎉 Chào ${pending.telegram_username ? "@" + pending.telegram_username : "bạn"}!`,
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

  // Rehydrate botConfig so any later handlers in this request see the right org
  botConfig.organizationId = pending.payload_org;
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
        url: `https://app.flowa.one/agents`,
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


// =====================================================
// /examples — example prompt library
// =====================================================
async function handleExamples(ctx: HandlerCtx): Promise<void> {
  const { supabase, botConfig, chatId } = ctx;

  const { data: prompts } = await supabase
    .from("telegram_example_prompts")
    .select("title, prompt, emoji, category")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(10);

  const list = (prompts ?? []) as Array<{ title: string; prompt: string; emoji: string | null; category: string | null }>;

  if (list.length === 0) {
    // Fallback hardcoded examples nếu chưa seed DB
    const fallback = [
      { title: "Campaign Black Friday cho thẩm mỹ viện", prompt: "Tạo campaign Black Friday giảm 30% cho dịch vụ thẩm mỹ viện, target nữ 25-40 tuổi", emoji: "🎁" },
      { title: "3 caption Facebook bán mỹ phẩm", prompt: "Viết 3 caption Facebook bán kem dưỡng da cho da khô, tone thân thiện", emoji: "💄" },
      { title: "Phân tích campaign tuần", prompt: "Phân tích hiệu quả các campaign tuần này, gợi ý cải thiện", emoji: "📊" },
      { title: "Idea content TikTok", prompt: "Cho 5 idea content TikTok cho spa làm đẹp, format storytime", emoji: "🎬" },
      { title: "Email sequence ra mắt sản phẩm", prompt: "Viết email sequence 5 email ra mắt sản phẩm serum mới", emoji: "✉️" },
    ];
    list.push(...fallback);
  }

  const lines: string[] = ["💡 *Ví dụ thực tế — bấm nút để thử ngay:*", ""];
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  list.slice(0, 7).forEach((p, idx) => {
    const emoji = p.emoji || "✨";
    lines.push(`${emoji} _${escapeMd(p.title)}_`);
    keyboard.push([{ text: `${emoji} Thử: ${p.title.slice(0, 40)}`, callback_data: `ux:ex:${idx}` }]);
  });
  lines.push("", "👉 Hoặc chat tự nhiên — mình hiểu tiếng Việt!");

  // Persist prompts to DB (survives worker recycles, 1h TTL)
  const promptTexts = list.slice(0, 7).map((p) => p.prompt);
  try {
    await supabase.from("telegram_example_cache").delete().eq("chat_id", chatId);
    if (promptTexts.length > 0) {
      await supabase.from("telegram_example_cache").insert(
        promptTexts.map((prompt, idx) => ({ chat_id: chatId, idx, prompt })),
      );
    }
  } catch (_e) { /* best-effort */ }

  await sendMessage(botConfig.botToken, chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

// Static starter prompts for Quick Launchpad (no cache needed — always available)
const STARTER_PROMPTS: Array<{ emoji: string; title: string; prompt: string }> = [
  { emoji: "📘", title: "1 bài Facebook giới thiệu sản phẩm", prompt: "Viết 1 bài Facebook giới thiệu sản phẩm chủ lực của thương hiệu, tone thân thiện, có CTA rõ ràng" },
  { emoji: "🎁", title: "Campaign khuyến mãi cuối tháng", prompt: "Tạo campaign khuyến mãi cuối tháng cho thương hiệu của tôi, target khách hàng nữ 25-40" },
  { emoji: "🎬", title: "5 idea content TikTok", prompt: "Cho 5 idea content TikTok cho thương hiệu, format storytime ngắn 30-60s" },
  { emoji: "✉️", title: "Email ra mắt sản phẩm mới", prompt: "Viết email sequence 3 email ra mắt sản phẩm mới cho khách hàng cũ" },
];

// =====================================================
// /tutorial — 3-step interactive tutorial
// =====================================================
async function handleTutorial(
  ctx: HandlerCtx & { telegramUserId?: number; step: number },
): Promise<void> {
  const { supabase, botConfig, chatId, step } = ctx;
  const stepClamped = Math.min(3, Math.max(1, step));

  const STEPS: Array<{ title: string; body: string; cta: string }> = [
    {
      title: "Bước 1/3 — Chat tự nhiên",
      body: "Cứ nhắn như chat với người thật.\n\n📝 *Thử gõ:* `tạo bài đăng FB cho spa làm đẹp`\n\nBot tự hiểu, không cần học cú pháp.",
      cta: "Tiếp ▶️",
    },
    {
      title: "Bước 2/3 — Lệnh nhanh",
      body: "Gõ `/` để xem menu lệnh, hoặc dùng nút bàn phím dưới.\n\n📊 `/status` — xem quota tháng này\n📋 `/campaigns` — list 5 campaign mới\n💡 `/examples` — ví dụ thực tế",
      cta: "Tiếp ▶️",
    },
    {
      title: "Bước 3/3 — Mini App",
      body: "Bấm nút *menu* (góc dưới-trái) để mở Mini App Flowa — quản lý đầy đủ ngay trong Telegram, không cần rời app.",
      cta: "✅ Hoàn tất",
    },
  ];

  const s = STEPS[stepClamped - 1];
  const keyboard: Array<Array<{ text: string; callback_data?: string; web_app?: { url: string } }>> = [];

  if (stepClamped < 3) {
    keyboard.push([{ text: s.cta, callback_data: `ux:tut:${stepClamped + 1}` }]);
  } else {
    keyboard.push([{ text: "🚀 Mở Mini App", web_app: { url: MINI_APP_URL } }]);
    keyboard.push([{ text: s.cta, callback_data: "ux:tut:done" }]);
  }

  await sendMessage(
    botConfig.botToken,
    chatId,
    `📚 *${s.title}*\n\n${s.body}`,
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } },
  );

  await supabase
    .from("telegram_chat_bindings")
    .update({ tutorial_step: stepClamped })
    .eq("organization_id", botConfig.organizationId)
    .eq("telegram_chat_id", chatId)
    .then(() => {}, () => {});
}

// =====================================================
// /settings — user preferences panel
// =====================================================
async function handleSettings(
  ctx: HandlerCtx & { telegramUserId?: number },
): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId } = ctx;

  const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, telegramUserId);
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId, "Chưa kết nối. /start trong DM trước.");
    return;
  }

  // Upsert default preferences if missing
  const { data: prefs } = await supabase
    .from("telegram_user_preferences")
    .select("daily_digest, language, verbose_mode, default_brand_id")
    .eq("organization_id", botConfig.organizationId)
    .eq("user_id", binding.userId)
    .maybeSingle();

  const cur = prefs ?? { daily_digest: true, language: "vi", verbose_mode: false, default_brand_id: null };
  const dg = cur.daily_digest ? "BẬT ✅" : "TẮT ⛔";
  const vb = cur.verbose_mode ? "BẬT ✅" : "TẮT ⛔";

  const lines = [
    "⚙️ *Cài đặt cá nhân*",
    "",
    `🔔 Daily digest: *${dg}*`,
    `🌐 Ngôn ngữ: *${(cur.language || "vi").toUpperCase()}*`,
    `🤖 Verbose mode: *${vb}*`,
    "",
    "Bấm nút để thay đổi:",
  ];

  const keyboard = [
    [
      { text: cur.daily_digest ? "🔕 Tắt digest" : "🔔 Bật digest", callback_data: "ux:set:digest" },
      { text: "🌐 Đổi ngôn ngữ", callback_data: "ux:set:lang" },
    ],
    [
      { text: cur.verbose_mode ? "🤖 Tắt verbose" : "🤖 Bật verbose", callback_data: "ux:set:verbose" },
      { text: "🎨 Brand mặc định", callback_data: "ux:set:brand" },
    ],
    [{ text: "🔓 Gỡ kết nối", callback_data: "ux:set:unlink" }],
  ];

  await sendMessage(botConfig.botToken, chatId, lines.join("\n"), {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard },
  });
}

// =====================================================
// UX callback router (welcome / help / tutorial / settings / examples)
// =====================================================
async function handleUxCallback(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  fromTgId?: number;
  cbId: string;
  data: string;
}): Promise<void> {
  const { supabase, botConfig, chatId, fromTgId, cbId, data } = args;
  const parts = data.split(":");
  const group = parts[1] || "";
  const key = parts.slice(2).join(":");

  // Acknowledge immediately so the spinner clears
  await answerCallback(botConfig.botToken, cbId).catch(() => {});

  const ctx: HandlerCtx = { supabase, botConfig, chatId };

  if (group === "welcome") {
    switch (key) {
      case "generate": {
        const keyboard = [
          ...STARTER_PROMPTS.map((p, idx) => [
            { text: `${p.emoji} ${p.title}`, callback_data: `ux:starter:${idx}` },
          ]),
          [
            { text: "💡 Xem thêm ví dụ", callback_data: "ux:welcome:examples" },
            { text: "📊 Brand đang dùng", callback_data: "ux:welcome:brand" },
          ],
        ];

        await sendMessage(botConfig.botToken, chatId,
          "✍️ *Tạo campaign đầu tiên*\n\nBấm 1 mẫu dưới để chạy ngay, hoặc chat tự nhiên ý tưởng của bạn:\n\n_VD: \"tạo campaign Tết cho spa làm đẹp giảm 30%\"_",
          { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
        return;
      }
      case "brand":
        await handleBrand({ ...ctx, telegramUserId: fromTgId, arg: "" });
        return;
      case "examples":
        await handleExamples(ctx);
        return;
      case "tutorial":
        await handleTutorial({ ...ctx, telegramUserId: fromTgId, step: 1 });
        return;
    }
  }

  if (group === "help") {
    const sections: Record<string, { title: string; body: string }> = {
      create: { title: "✍️ Tạo nội dung", body: "• `/generate <mô tả>` — tạo campaign\n• `/examples` — ví dụ\n• Hoặc chat tự nhiên: _\"viết 3 caption FB cho serum\"_" },
      report: { title: "📊 Xem báo cáo", body: "• `/status` — quota & pipeline tháng\n• `/campaigns` — 5 campaign gần nhất\n• Mini App: dashboard đầy đủ" },
      brand: { title: "⚙️ Quản lý brand", body: "• `/brand` — xem brand active\n• `/brand <tên>` — đổi brand\n• Quản lý chi tiết tại app.flowa.one" },
      quota: { title: "💳 Quota & gói", body: "• `/status` — xem quota còn lại\n• Upgrade tại app.flowa.one/pricing" },
      group: { title: "👥 Group team", body: "• Add bot vào group\n• Admin gõ `/link_group` để link group với tổ chức\n• Member đã `/start` DM có thể `/generate` từ group" },
      support: { title: "❓ Cần hỗ trợ", body: "📧 support@flowa.one\n🌐 help.flowa.one\n💬 Chat trong app" },
    };
    const s = sections[key];
    if (s) {
      await sendMessage(botConfig.botToken, chatId, `*${s.title}*\n\n${s.body}`, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "← Quay lại menu", callback_data: "ux:help:menu" }]] },
      });
      return;
    }
    if (key === "menu") {
      await sendMessage(botConfig.botToken, chatId, "🎯 *Bạn muốn làm gì?*", {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buildHelpKeyboard() },
      });
      return;
    }
  }

  if (group === "tut") {
    if (key === "done") {
      await supabase
        .from("telegram_chat_bindings")
        .update({ tutorial_completed_at: new Date().toISOString() })
        .eq("organization_id", botConfig.organizationId)
        .eq("telegram_chat_id", chatId)
        .then(() => {}, () => {});
      await sendMessage(botConfig.botToken, chatId, "🎉 Hoàn tất hướng dẫn! Cứ chat tự nhiên với mình nhé.");
      return;
    }
    const next = parseInt(key, 10);
    if (!Number.isNaN(next)) {
      await handleTutorial({ ...ctx, telegramUserId: fromTgId, step: next });
      return;
    }
  }

  if (group === "starter") {
    const idx = parseInt(key, 10);
    const prompt = STARTER_PROMPTS[idx]?.prompt;
    if (!prompt) {
      await sendMessage(botConfig.botToken, chatId, "Mẫu không hợp lệ, gõ /start để thử lại.");
      return;
    }
    await sendMessage(botConfig.botToken, chatId, `🚀 *Đang chạy:*\n_${escapeMd(prompt)}_`, { parse_mode: "Markdown" });
    await handleGenerate({ ...ctx, telegramUserId: fromTgId, prompt });
    return;
  }

  if (group === "ex") {
    const idx = parseInt(key, 10);
    const { data } = await supabase
      .from("telegram_example_cache")
      .select("prompt")
      .eq("chat_id", chatId)
      .eq("idx", idx)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data?.prompt) {
      const prompt = data.prompt as string;
      await sendMessage(botConfig.botToken, chatId, `🚀 *Đang chạy:*\n_${escapeMd(prompt)}_`, { parse_mode: "Markdown" });
      await handleGenerate({ ...ctx, telegramUserId: fromTgId, prompt });
      return;
    }
    await sendMessage(botConfig.botToken, chatId, "Ví dụ này đã hết hạn, gõ /examples để xem lại.");
    return;
  }

  if (group === "set") {
    if (!fromTgId) return;
    const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, fromTgId);
    if (!binding) return;

    if (key === "digest" || key === "verbose") {
      const col = key === "digest" ? "daily_digest" : "verbose_mode";
      const { data: cur } = await supabase
        .from("telegram_user_preferences")
        .select(col)
        .eq("organization_id", botConfig.organizationId)
        .eq("user_id", binding.userId)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const newVal = !((cur as any)?.[col] ?? (key === "digest"));
      await supabase
        .from("telegram_user_preferences")
        .upsert({
          organization_id: botConfig.organizationId,
          user_id: binding.userId,
          [col]: newVal,
        }, { onConflict: "organization_id,user_id" });
      await sendMessage(botConfig.botToken, chatId, `✅ Đã ${newVal ? "BẬT" : "TẮT"} ${key === "digest" ? "daily digest" : "verbose mode"}.`);
      return;
    }
    if (key === "lang") {
      await sendMessage(botConfig.botToken, chatId, "🌐 Chọn ngôn ngữ:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🇻🇳 Tiếng Việt", callback_data: "ux:setlang:vi" }, { text: "🇬🇧 English", callback_data: "ux:setlang:en" }],
            [{ text: "🇹🇭 ภาษาไทย", callback_data: "ux:setlang:th" }],
          ],
        },
      });
      return;
    }
    if (key === "brand") {
      await handleBrand({ ...ctx, telegramUserId: fromTgId, arg: "" });
      return;
    }
    if (key === "unlink") {
      await sendMessage(botConfig.botToken, chatId,
        "⚠️ Để gỡ kết nối, vào *app.flowa.one → Agent → Telegram → Gỡ kết nối*.",
        { parse_mode: "Markdown" });
      return;
    }
  }

  if (group === "setlang") {
    if (!fromTgId) return;
    const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, fromTgId);
    if (!binding) return;
    await supabase
      .from("telegram_user_preferences")
      .upsert({
        organization_id: botConfig.organizationId,
        user_id: binding.userId,
        language: key,
      }, { onConflict: "organization_id,user_id" });
    await sendMessage(botConfig.botToken, chatId, `✅ Đã đổi ngôn ngữ sang *${key.toUpperCase()}*.`, { parse_mode: "Markdown" });
    return;
  }

  if (group === "hint" && key === "freechat") {
    await sendMessage(botConfig.botToken, chatId, "💬 Cứ gõ tin nhắn bình thường — mình hiểu tiếng Việt và sẽ tự nhận diện ý định!");
    return;
  }
}

// =====================================================
// Brand switcher callback router — brand:switch:<id> | brand:open | brand:page:<n> | brand:search | brand:noop
// =====================================================
async function handleBrandCallback(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  fromTgId?: number;
  cbId: string;
  messageId?: number;
  data: string;
}): Promise<void> {
  const { supabase, botConfig, chatId, fromTgId, cbId, messageId, data } = args;
  const parts = data.split(":");
  const action = parts[1];
  const param = parts.slice(2).join(":");
  const state = getBrandSwitcherState(chatId);

  if (action === "noop") {
    await answerCallback(botConfig.botToken, cbId).catch(() => {});
    return;
  }

  if (action === "open") {
    await answerCallback(botConfig.botToken, cbId).catch(() => {});
    state.filter = undefined;
    state.page = 0;
    const brands = await fetchOrgBrands(supabase, botConfig.organizationId);
    if (brands.length === 0) {
      await sendMessage(botConfig.botToken, chatId, "Tổ chức chưa có brand nào.");
      return;
    }
    await renderBrandSwitcher({ supabase, botConfig, chatId, brands });
    return;
  }

  if (action === "page") {
    const next = parseInt(param, 10);
    if (Number.isNaN(next)) {
      await answerCallback(botConfig.botToken, cbId).catch(() => {});
      return;
    }
    state.page = next;
    await answerCallback(botConfig.botToken, cbId).catch(() => {});
    const brands = await fetchOrgBrands(supabase, botConfig.organizationId);
    await renderBrandSwitcher({ supabase, botConfig, chatId, brands, replaceMessageId: messageId });
    return;
  }

  if (action === "search") {
    state.awaitingSearch = true;
    await answerCallback(botConfig.botToken, cbId, "Gõ tên brand để lọc").catch(() => {});
    await sendMessage(botConfig.botToken, chatId, "🔍 Gõ tên brand để tìm (hoặc /brand để hủy):", {
      reply_markup: { force_reply: true, selective: true, input_field_placeholder: "VD: spa" },
    });
    return;
  }

  if (action === "switch") {
    const brandId = param;
    if (!brandId) {
      await answerCallback(botConfig.botToken, cbId, "Brand không hợp lệ.").catch(() => {});
      return;
    }
    const result = await switchActiveBrand(supabase, botConfig.organizationId, chatId, brandId);
    if (!result.ok) {
      await answerCallback(botConfig.botToken, cbId, "❌ Không lưu được", true).catch(() => {});
      return;
    }
    const brands = await fetchOrgBrands(supabase, botConfig.organizationId);
    const switched = brands.find((b) => b.id === brandId);
    await answerCallback(botConfig.botToken, cbId, switched ? `✅ Đã đổi sang ${switched.brand_name}` : "✅ Đã đổi").catch(() => {});
    if (messageId) {
      await renderBrandSwitcher({ supabase, botConfig, chatId, brands, replaceMessageId: messageId });
    }
    return;
  }

  await answerCallback(botConfig.botToken, cbId).catch(() => {});
}

// =====================================================
// Campaign Wizard (multi-step interactive flow)
// =====================================================
import {
  buildDurationKeyboard,
  buildChannelsKeyboard,
  buildFrequencyKeyboard,
  buildApprovalKeyboard,
  buildConfirmKeyboard,
  ALL_CHANNELS as CW_ALL_CHANNELS,
} from "../_shared/telegram-keyboards.ts";

type WizardStep =
  | "description"
  | "duration"
  | "channels"
  | "frequency"
  | "approval"
  | "confirm";

interface WizardDraft {
  description?: string;
  duration_days?: number;
  channels?: string[];
  cadence?: "weekly" | "daily";
  per_week?: number;
  approval_mode?: "approve_plan" | "approve_each" | "full_auto";
  brand_template_id?: string | null;
  brand_name?: string | null;
  available_channels?: string[];
  edit_goal_id?: string | null;
}

interface WizardState {
  chat_id: number;
  user_id: string;
  flow: string;
  step: WizardStep;
  draft: WizardDraft;
}

// deno-lint-ignore no-explicit-any
async function getWizardState(supabase: any, chatId: number, telegramUserId: number): Promise<WizardState | null> {
  // Resolve telegram user → app user via DM binding
  const { data: dm } = await supabase
    .from("telegram_chat_bindings")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .eq("chat_type", "private")
    .maybeSingle();
  if (!dm?.user_id) return null;
  const { data } = await supabase
    .from("telegram_chat_state")
    .select("chat_id, user_id, flow, step, draft, updated_at")
    .eq("chat_id", chatId)
    .eq("user_id", dm.user_id)
    .maybeSingle();
  if (!data) return null;
  // TTL guard — if older than 30min, treat as expired.
  const updatedAt = new Date(data.updated_at).getTime();
  if (Date.now() - updatedAt > 30 * 60 * 1000) {
    await clearWizardState(supabase, chatId, dm.user_id);
    return null;
  }
  return data as WizardState;
}

// deno-lint-ignore no-explicit-any
async function setWizardState(supabase: any, chatId: number, userId: string, step: WizardStep, draft: WizardDraft) {
  const { error } = await supabase
    .from("telegram_chat_state")
    .upsert({
      chat_id: chatId,
      user_id: userId,
      flow: "campaign_wizard",
      step,
      draft,
      updated_at: new Date().toISOString(),
    }, { onConflict: "chat_id,user_id" });
  if (error) console.error("[wizard] setState error:", error);
}

// deno-lint-ignore no-explicit-any
async function clearWizardState(supabase: any, chatId: number, userId: string) {
  await supabase
    .from("telegram_chat_state")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);
}

// Resolve which channels actually have an active connection for the brand/org.
// deno-lint-ignore no-explicit-any
async function getAvailableChannels(supabase: any, organizationId: string, brandTemplateId: string | null): Promise<string[]> {
  try {
    let q = supabase
      .from("social_connections")
      .select("platform, brand_template_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true);
    if (brandTemplateId) q = q.or(`brand_template_id.eq.${brandTemplateId},brand_template_id.is.null`);
    const { data } = await q;
    if (!data || data.length === 0) return [];
    const set = new Set<string>();
    for (const row of data as Array<{ platform: string }>) {
      const p = String(row.platform || "").toLowerCase();
      if (p) set.add(p);
    }
    return Array.from(set);
  } catch (e) {
    console.warn("[wizard] getAvailableChannels failed:", e);
    return [];
  }
}

// LLM extract for /generate Quick mode. Falls back to safe defaults.
async function extractCampaignParams(prompt: string, availableChannels: string[]): Promise<{
  channels: string[];
  duration_days: number;
  cadence: "weekly" | "daily";
  per_week: number;
  suggested_name: string;
  reasoning?: string;
}> {
  const fallback = {
    channels: availableChannels.length > 0
      ? availableChannels.filter(c => ["facebook", "website", "instagram"].includes(c)).slice(0, 2) || ["facebook", "website"]
      : ["facebook", "website"],
    duration_days: 14,
    cadence: "weekly" as const,
    per_week: 3,
    suggested_name: prompt.slice(0, 80),
  };
  // Ensure at least one channel
  if (fallback.channels.length === 0) fallback.channels = ["facebook", "website"];

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("[extractCampaignParams] no LOVABLE_API_KEY, using fallback");
    return fallback;
  }

  try {
    const sys = `Bạn trích xuất tham số campaign marketing từ mô tả tiếng Việt/Anh. Trả về JSON đúng schema. Nếu user không nói rõ, giữ default hợp lý.`;
    const channelHint = availableChannels.length > 0
      ? `Các kênh đang có connection: ${availableChannels.join(", ")}. Ưu tiên chọn từ danh sách này.`
      : `Chỉ chọn từ: facebook, instagram, website, tiktok, linkedin, threads, x, zalo.`;
    const user = `Mô tả: "${prompt}"\n\n${channelHint}\n\nTrả về JSON với:\n- channels: array tên kênh (lowercase)\n- duration_days: số ngày (1-90, default 14)\n- cadence: "weekly" hoặc "daily"\n- per_week: số bài mỗi tuần (1-7, default 3)\n- suggested_name: tên ngắn cho campaign (<80 chars)\n- reasoning: 1 câu giải thích`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.warn("[extractCampaignParams] gateway failed:", res.status);
      return fallback;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return fallback;
    const parsed = JSON.parse(content);

    const ALLOWED = ["facebook", "instagram", "website", "tiktok", "linkedin", "threads", "x", "zalo"];
    const channels = Array.isArray(parsed.channels)
      ? parsed.channels.map((c: string) => String(c).toLowerCase()).filter((c: string) => ALLOWED.includes(c))
      : [];
    const duration = Math.min(90, Math.max(1, Number(parsed.duration_days) || 14));
    const cadence: "weekly" | "daily" = parsed.cadence === "daily" ? "daily" : "weekly";
    const perWeek = Math.min(7, Math.max(1, Number(parsed.per_week) || 3));

    return {
      channels: channels.length > 0 ? channels : fallback.channels,
      duration_days: duration,
      cadence,
      per_week: perWeek,
      suggested_name: String(parsed.suggested_name || prompt).slice(0, 80),
      reasoning: parsed.reasoning ? String(parsed.reasoning).slice(0, 200) : undefined,
    };
  } catch (e) {
    console.warn("[extractCampaignParams] error:", e);
    return fallback;
  }
}

// Entry: /campaign command
async function startCampaignWizard(ctx: HandlerCtx & { telegramUserId?: number; initialPrompt?: string }): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, initialPrompt } = ctx;
  if (!telegramUserId) {
    await sendMessage(botConfig.botToken, chatId, "❌ Không xác định được user.");
    return;
  }
  const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, telegramUserId);
  if (!binding) {
    await sendMessage(botConfig.botToken, chatId, "Chưa kết nối. Hãy /start trong DM trước.");
    return;
  }
  const activeBrand = await getActiveBrandContext(supabase, botConfig.organizationId, chatId);
  const available = await getAvailableChannels(
    supabase,
    botConfig.organizationId,
    (activeBrand as any)?.id ?? null,
  );

  const draft: WizardDraft = {
    brand_template_id: (activeBrand as any)?.id ?? null,
    brand_name: (activeBrand as any)?.brand_name ?? null,
    available_channels: available,
  };

  if (initialPrompt && initialPrompt.trim().length > 0) {
    draft.description = initialPrompt.trim();
    await setWizardState(supabase, chatId, binding.userId, "duration", draft);
    await sendMessage(
      botConfig.botToken,
      chatId,
      `📅 *Campaign Wizard (2/5)*\n\n_Mô tả:_ ${initialPrompt.slice(0, 200)}\n\nChọn thời lượng campaign:`,
      { parse_mode: "Markdown", reply_markup: buildDurationKeyboard() },
    );
  } else {
    await setWizardState(supabase, chatId, binding.userId, "description", draft);
    await sendMessage(
      botConfig.botToken,
      chatId,
      `📝 *Campaign Wizard (1/5)*\n\nMô tả campaign bạn muốn tạo?\n_Ví dụ:_ "Viết content cho spa làm đẹp tháng 5"\n\n_(Gõ /cancel để hủy)_`,
      { parse_mode: "Markdown" },
    );
  }
}

// Called when user types text in the description step.
async function continueWizardWithDescription(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  telegramUserId: number;
  description: string;
}): Promise<void> {
  const { supabase, botConfig, chatId, telegramUserId, description } = args;
  const state = await getWizardState(supabase, chatId, telegramUserId);
  if (!state) return;
  state.draft.description = description.trim();
  await setWizardState(supabase, chatId, state.user_id, "duration", state.draft);
  await sendMessage(
    botConfig.botToken,
    chatId,
    `📅 *Campaign Wizard (2/5)*\n\nChọn thời lượng campaign:`,
    { parse_mode: "Markdown", reply_markup: buildDurationKeyboard() },
  );
}

// Build summary card for confirm step.
function buildSummaryText(draft: WizardDraft): string {
  const channels = (draft.channels || []).map(c => {
    const m = CW_ALL_CHANNELS.find(x => x.id === c);
    return m?.label || c;
  }).join(", ") || "(chưa chọn)";
  const freq = draft.cadence === "daily"
    ? "Hàng ngày"
    : `${draft.per_week ?? 3} bài/tuần`;
  const approvalLabel = draft.approval_mode === "approve_each" ? "Duyệt từng bài"
    : draft.approval_mode === "full_auto" ? "Tự động hoàn toàn"
    : "Duyệt kế hoạch";
  return [
    `✅ *Tóm tắt campaign*`,
    ``,
    `📝 ${draft.description?.slice(0, 200) || "(không có mô tả)"}`,
    `📅 ${draft.duration_days || 14} ngày`,
    `📢 ${channels}`,
    `⚡ ${freq}`,
    `🛡️ ${approvalLabel}`,
    `🎨 Brand: ${draft.brand_name || "(mặc định)"}`,
    ``,
    `Tạo campaign này?`,
  ].join("\n");
}

// Main wizard callback handler
async function handleCampaignWizardCallback(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  fromTgId: number;
  cbId: string;
  messageId?: number;
  data: string;
}): Promise<void> {
  const { supabase, botConfig, chatId, fromTgId, cbId, messageId, data } = args;
  const parts = data.split(":");
  // cw:<step>:<value...>
  const step = parts[1];
  const value = parts.slice(2).join(":");

  // Cancel — works without active state
  if (step === "cancel") {
    const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, fromTgId);
    if (binding) await clearWizardState(supabase, chatId, binding.userId);
    if (value && value !== "1") {
      // cancel a specific goal (soft mark inactive)
      await supabase.from("agent_goals").update({ is_active: false, is_paused: true }).eq("id", value);
    }
    await answerCallback(botConfig.botToken, cbId, "Đã hủy").catch(() => {});
    if (messageId) {
      await editMessageText(botConfig.botToken, chatId, messageId, "❌ Đã hủy wizard.").catch(() => {});
    }
    return;
  }

  // Edit — restart wizard prefilled from existing goal
  if (step === "edit") {
    const goalId = value;
    const binding = await lookupUserBinding(supabase, botConfig.organizationId, chatId, fromTgId);
    if (!binding) {
      await answerCallback(botConfig.botToken, cbId, "Chưa kết nối", true).catch(() => {});
      return;
    }
    const { data: goal } = await supabase
      .from("agent_goals")
      .select("id, name, description, target_channels, frequency, campaign_duration_days, approval_mode, brand_template_id")
      .eq("id", goalId)
      .maybeSingle();
    if (!goal) {
      await answerCallback(botConfig.botToken, cbId, "Goal không tồn tại", true).catch(() => {});
      return;
    }
    const { data: brand } = goal.brand_template_id ? await supabase
      .from("brand_templates")
      .select("brand_name")
      .eq("id", goal.brand_template_id)
      .maybeSingle() : { data: null };
    const available = await getAvailableChannels(supabase, botConfig.organizationId, goal.brand_template_id);
    const draft: WizardDraft = {
      description: goal.description || goal.name,
      duration_days: goal.campaign_duration_days || 14,
      channels: Array.isArray(goal.target_channels) ? goal.target_channels : [],
      cadence: (goal.frequency?.cadence === "daily") ? "daily" : "weekly",
      per_week: Number(goal.frequency?.per_week) || 3,
      approval_mode: goal.approval_mode || "approve_plan",
      brand_template_id: goal.brand_template_id,
      brand_name: (brand as any)?.brand_name || null,
      available_channels: available,
      edit_goal_id: goalId,
    };
    await setWizardState(supabase, chatId, binding.userId, "duration", draft);
    await answerCallback(botConfig.botToken, cbId, "✏️ Vào chế độ sửa").catch(() => {});
    await sendMessage(
      botConfig.botToken,
      chatId,
      `✏️ *Sửa campaign* — đang sửa goal có sẵn.\n\n📅 Chọn lại thời lượng (hiện tại: ${draft.duration_days} ngày):`,
      { parse_mode: "Markdown", reply_markup: buildDurationKeyboard() },
    );
    return;
  }

  // Other steps require active state
  const state = await getWizardState(supabase, chatId, fromTgId);
  if (!state) {
    await answerCallback(botConfig.botToken, cbId, "Phiên wizard đã hết hạn. /campaign để bắt đầu lại.", true).catch(() => {});
    return;
  }
  const draft = state.draft;

  if (step === "duration") {
    draft.duration_days = Math.min(90, Math.max(1, Number(value) || 14));
    if (!draft.channels) draft.channels = [];
    await setWizardState(supabase, chatId, state.user_id, "channels", draft);
    await answerCallback(botConfig.botToken, cbId, `${draft.duration_days} ngày`).catch(() => {});
    await sendMessage(
      botConfig.botToken,
      chatId,
      `📢 *Campaign Wizard (3/5)*\n\nChọn kênh (chọn nhiều, bấm ✅ Xong khi xong):`,
      { parse_mode: "Markdown", reply_markup: buildChannelsKeyboard(draft.channels, draft.available_channels) },
    );
    return;
  }

  if (step === "channels") {
    draft.channels = draft.channels || [];
    if (value === "__done") {
      if (draft.channels.length === 0) {
        await answerCallback(botConfig.botToken, cbId, "Chọn ít nhất 1 kênh", true).catch(() => {});
        return;
      }
      await setWizardState(supabase, chatId, state.user_id, "frequency", draft);
      await answerCallback(botConfig.botToken, cbId, `${draft.channels.length} kênh`).catch(() => {});
      await sendMessage(
        botConfig.botToken,
        chatId,
        `⚡ *Campaign Wizard (4/5)*\n\nTần suất đăng:`,
        { parse_mode: "Markdown", reply_markup: buildFrequencyKeyboard() },
      );
      return;
    }
    // toggle channel
    const idx = draft.channels.indexOf(value);
    if (idx >= 0) draft.channels.splice(idx, 1);
    else draft.channels.push(value);
    await setWizardState(supabase, chatId, state.user_id, "channels", draft);
    await answerCallback(botConfig.botToken, cbId, draft.channels.includes(value) ? `+${value}` : `-${value}`).catch(() => {});
    if (messageId) {
      await editMessageReplyMarkup(botConfig.botToken, chatId, messageId, buildChannelsKeyboard(draft.channels, draft.available_channels))
        .catch(() => {});
    }
    return;
  }

  if (step === "freq") {
    // value = "weekly:3" or "daily:7"
    const [cad, per] = value.split(":");
    draft.cadence = cad === "daily" ? "daily" : "weekly";
    draft.per_week = Math.min(7, Math.max(1, Number(per) || 3));
    await setWizardState(supabase, chatId, state.user_id, "approval", draft);
    await answerCallback(botConfig.botToken, cbId, "OK").catch(() => {});
    await sendMessage(
      botConfig.botToken,
      chatId,
      `🛡️ *Campaign Wizard (5/5)*\n\nChế độ duyệt:`,
      { parse_mode: "Markdown", reply_markup: buildApprovalKeyboard() },
    );
    return;
  }

  if (step === "approval") {
    const allowed = ["approve_plan", "approve_each", "full_auto"];
    draft.approval_mode = allowed.includes(value) ? value as any : "approve_plan";
    await setWizardState(supabase, chatId, state.user_id, "confirm", draft);
    await answerCallback(botConfig.botToken, cbId, "OK").catch(() => {});
    await sendMessage(
      botConfig.botToken,
      chatId,
      buildSummaryText(draft),
      { parse_mode: "Markdown", reply_markup: buildConfirmKeyboard() },
    );
    return;
  }

  if (step === "confirm") {
    if (value === "edit") {
      // Restart from duration with current draft
      await setWizardState(supabase, chatId, state.user_id, "duration", draft);
      await answerCallback(botConfig.botToken, cbId, "Sửa lại").catch(() => {});
      await sendMessage(
        botConfig.botToken,
        chatId,
        `✏️ Sửa lại từ bước thời lượng:`,
        { reply_markup: buildDurationKeyboard() },
      );
      return;
    }
    if (value === "go") {
      await commitWizardGoal({ supabase, botConfig, chatId, state, cbId, messageId });
      return;
    }
  }

  await answerCallback(botConfig.botToken, cbId).catch(() => {});
}

async function commitWizardGoal(args: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  botConfig: HandlerCtx["botConfig"];
  chatId: number;
  state: WizardState;
  cbId: string;
  messageId?: number;
}): Promise<void> {
  const { supabase, botConfig, chatId, state, cbId, messageId } = args;
  const draft = state.draft;

  // Quota gate
  const gate = await assertCanCreateGoal(supabase, botConfig.organizationId, state.user_id);
  if (!gate.ok) {
    await answerCallback(botConfig.botToken, cbId, "Hết quota").catch(() => {});
    await sendMessage(botConfig.botToken, chatId, gate.message);
    await clearWizardState(supabase, chatId, state.user_id);
    return;
  }

  const today = new Date();
  const duration = draft.duration_days || 14;
  const endDate = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000);

  let goalId = draft.edit_goal_id || null;
  let goalName = (draft.description || "Campaign").slice(0, 120);

  const payload = {
    name: goalName,
    description: draft.description || "",
    organization_id: botConfig.organizationId,
    created_by: state.user_id,
    target_topics: [],
    target_channels: draft.channels || ["facebook", "website"],
    frequency: { cadence: draft.cadence || "weekly", per_week: draft.per_week || 3 },
    campaign_duration_days: duration,
    campaign_start_date: today.toISOString().split("T")[0],
    campaign_end_date: endDate.toISOString().split("T")[0],
    brand_template_id: draft.brand_template_id || null,
    autonomy_level: botConfig.defaultAutonomyLevel,
    approval_mode: draft.approval_mode || "approve_plan",
    is_active: true,
    is_paused: false,
    clarification_context: { telegram_wizard: true },
  };

  if (goalId) {
    const { error } = await supabase.from("agent_goals").update(payload).eq("id", goalId);
    if (error) {
      console.error("[wizard] update goal failed:", error);
      await answerCallback(botConfig.botToken, cbId, "Lỗi update", true).catch(() => {});
      return;
    }
  } else {
    const { data: goal, error } = await supabase
      .from("agent_goals")
      .insert(payload)
      .select("id, name")
      .single();
    if (error || !goal) {
      console.error("[wizard] insert goal failed:", error);
      await answerCallback(botConfig.botToken, cbId, "Lỗi tạo goal", true).catch(() => {});
      return;
    }
    goalId = goal.id;
    goalName = goal.name;
  }

  await clearWizardState(supabase, chatId, state.user_id);
  await answerCallback(botConfig.botToken, cbId, "🚀 Đang tạo...").catch(() => {});

  if (messageId) {
    await editMessageText(
      botConfig.botToken,
      chatId,
      messageId,
      `✅ Goal "${goalName}" đã ${draft.edit_goal_id ? "cập nhật" : "tạo"}.\nĐang khởi chạy pipeline trong nền...`,
    ).catch(() => {});
  }

  // Trigger pipeline (fire-and-report-quickly)
  try {
    const r = await Promise.race([
      triggerPipeline(goalId!, botConfig.organizationId),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000)),
    ]) as { success?: boolean; error?: string; status?: number };
    console.log("[wizard] pipeline result:", r);
    if (r?.success === false && r?.error) {
      await sendMessage(botConfig.botToken, chatId,
        `⚠️ Goal lưu rồi nhưng trigger pipeline lỗi: ${String(r.error).slice(0, 120)}. Thử /status sau ít phút.`);
    } else {
      await sendMessage(botConfig.botToken, chatId,
        `✅ Pipeline đang chạy. Dùng /status sau ~1 phút để xem tiến độ.`);
    }
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    if (msg.includes("timeout")) {
      await sendMessage(botConfig.botToken, chatId,
        `✅ Goal đã lưu, hệ thống đang xử lý nền. Dùng /status sau 1-2 phút.`);
    } else {
      await sendMessage(botConfig.botToken, chatId,
        `⚠️ Lỗi trigger pipeline: ${msg.slice(0, 100)}. Thử /status.`);
    }
  }
}
