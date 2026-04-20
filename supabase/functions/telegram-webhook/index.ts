import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import {
  assertCanCreateGoal,
  resolveBotConfig,
  sendMessage,
  verifyLinkToken,
} from "../_shared/telegram-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

// deno-lint-ignore no-explicit-any
type TelegramUpdate = any;

// In-memory dedup of Telegram update_id to avoid double-processing on retry.
// Bounded LRU-ish set; entries expire via size cap (Telegram retries within seconds).
const RECENT_UPDATES = new Set<number>();
const RECENT_UPDATES_MAX = 500;
function isDuplicateUpdate(updateId: number): boolean {
  if (RECENT_UPDATES.has(updateId)) return true;
  RECENT_UPDATES.add(updateId);
  if (RECENT_UPDATES.size > RECENT_UPDATES_MAX) {
    const first = RECENT_UPDATES.values().next().value;
    if (first !== undefined) RECENT_UPDATES.delete(first);
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
    if (typeof update.update_id === "number" && isDuplicateUpdate(update.update_id)) {
      console.log("[telegram-webhook] duplicate update_id skipped:", update.update_id);
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

    // Handle non-text messages (sticker, photo, voice, document, ...) in DM
    if (typeof message.text !== "string") {
      const contentType = message.sticker ? "sticker"
        : message.photo ? "photo"
        : message.voice ? "voice"
        : message.document ? "document"
        : message.video ? "video"
        : "unknown";
      console.log("[telegram-webhook] non-text message:", {
        update_id: update.update_id,
        chatType,
        contentType,
        org: botConfig.organizationId,
      });
      if (chatType === "private") {
        await sendMessage(
          botConfig.botToken,
          chatId,
          "🤖 Hiện bot chỉ hiểu tin nhắn text. Gõ /help để xem các lệnh có sẵn.",
        );
      }
      return okResponse();
    }

    const text: string = message.text.trim();
    const [command, ...argParts] = text.split(/\s+/);
    const args = argParts.join(" ");

    console.log("[telegram-webhook] message:", {
      update_id: update.update_id,
      chatType,
      command,
      argsLength: args.length,
      org: botConfig.organizationId,
      bot: botConfig.botUsername,
    });

    switch (command) {
      case "/start":
        await handleStart({
          supabase,
          botConfig,
          chatId,
          chatType,
          telegramUserId,
          telegramUsername,
          token: args,
        });
        break;
      case "/help":
        await sendMessage(botConfig.botToken, chatId, helpText());
        break;
      case "/status":
        await handleStatus({ supabase, botConfig, chatId });
        break;
      case "/generate":
        if (chatType !== "private") {
          await sendMessage(
            botConfig.botToken,
            chatId,
            "⚠️ Lệnh /generate chỉ dùng trong DM với bot để tránh spam quota.",
          );
          break;
        }
        await handleGenerate({
          supabase,
          botConfig,
          chatId,
          telegramUserId,
          prompt: args,
        });
        break;
      case "/link_group":
        await handleLinkGroup({
          supabase,
          botConfig,
          chatId,
          chatType,
          telegramUserId,
        });
        break;
      default:
        if (chatType === "private") {
          await sendMessage(
            botConfig.botToken,
            chatId,
            "Lệnh không hợp lệ. Gõ /help để xem hướng dẫn.",
          );
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
    "/link_group — (Admin, trong group) Kết nối group với tổ chức",
    "/help — Hiện danh sách này",
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
    await sendMessage(
      botConfig.botToken,
      chatId,
      "Để kết nối, mở app Flowa và bấm 'Link Telegram' để lấy link.",
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
    `✅ Đã kết nối! Gõ /help để xem lệnh có sẵn.`,
  );
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

  const result = await assertCanCreateGoal(
    supabase,
    botConfig.organizationId,
    binding.userId,
  );

  if (!result.ok) {
    await sendMessage(botConfig.botToken, chatId, result.message);
    return;
  }

  const quotaLine = result.monthlyLimit === null
    ? "Quota: không giới hạn"
    : `Quota: ${result.pipelinesUsed}/${result.monthlyLimit} pipeline tháng này`;

  await sendMessage(
    botConfig.botToken,
    chatId,
    [
      "📊 Trạng thái của bạn:",
      quotaLine,
      `Autonomy tối đa: ${result.maxAutonomyLevel}`,
    ].join("\n"),
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
