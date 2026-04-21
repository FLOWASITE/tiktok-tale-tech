// Telegram Bot API client + link token utilities + permission gate.
// Used by telegram-webhook and telegram-link-token edge functions.

import { decryptCredential } from "./crypto.ts";

const TELEGRAM_API = "https://api.telegram.org";

// =====================================================
// Telegram Bot API wrappers
// =====================================================
export interface SendMessageOptions {
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML";
  reply_markup?: unknown;
  disable_web_page_preview?: boolean;
}

export async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  opts: SendMessageOptions = {},
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...opts }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[telegram-client] sendMessage failed:", res.status, body);
  }
}

export async function sendChatAction(
  botToken: string,
  chatId: number,
  action: "typing" | "upload_photo" | "record_video" = "typing",
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch (err) {
    // Non-critical; log and continue.
    console.warn("[telegram-client] sendChatAction failed:", err);
  }
}

export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
  dropPending = false,
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: dropPending,
    }),
  });
  return await res.json();
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export async function getWebhookInfo(
  botToken: string,
): Promise<{ ok: boolean; result?: TelegramWebhookInfo; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getWebhookInfo`);
  return await res.json();
}

// =====================================================
// Bot commands menu (native Telegram "/" menu button)
// =====================================================
export interface BotCommand {
  command: string;
  description: string;
}

export const BOT_COMMANDS: BotCommand[] = [
  { command: "start", description: "Bắt đầu / kết nối tài khoản" },
  { command: "examples", description: "Xem ví dụ prompt thực tế" },
  { command: "tutorial", description: "Hướng dẫn 30s cho người mới" },
  { command: "status", description: "Xem quota & pipeline tháng này" },
  { command: "brand", description: "Chọn thương hiệu active" },
  { command: "campaigns", description: "5 campaign gần nhất" },
  { command: "generate", description: "Tạo campaign mới từ mô tả" },
  { command: "settings", description: "Cài đặt cá nhân (digest, ngôn ngữ…)" },
  { command: "cancel", description: "Hủy pipeline đang chạy" },
  { command: "help", description: "Menu hướng dẫn theo nhu cầu" },
];

// =====================================================
// Inline keyboard builders — UX overhaul Phase 1+2
// =====================================================

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

export type InlineKeyboard = InlineButton[][];

// Welcome 4-button grid shown right after successful /start link.
export function buildWelcomeKeyboard(webAppUrl?: string): InlineKeyboard {
  const rows: InlineKeyboard = [
    [
      { text: "🚀 Tạo campaign đầu", callback_data: "ux:welcome:generate" },
      { text: "📊 Brand hiện tại", callback_data: "ux:welcome:brand" },
    ],
    [
      { text: "💡 Xem ví dụ thực tế", callback_data: "ux:welcome:examples" },
      { text: "📚 Hướng dẫn 30s", callback_data: "ux:welcome:tutorial" },
    ],
  ];
  if (webAppUrl) {
    rows.push([{ text: "🚀 Mở Mini App Flowa", web_app: { url: webAppUrl } }]);
  }
  return rows;
}

// Help redesign — grouped by use case (drill-down).
export function buildHelpKeyboard(): InlineKeyboard {
  return [
    [
      { text: "✍️ Tạo nội dung", callback_data: "ux:help:create" },
      { text: "📊 Xem báo cáo", callback_data: "ux:help:report" },
    ],
    [
      { text: "⚙️ Quản lý brand", callback_data: "ux:help:brand" },
      { text: "💳 Quota & gói", callback_data: "ux:help:quota" },
    ],
    [
      { text: "👥 Group team", callback_data: "ux:help:group" },
      { text: "❓ Cần hỗ trợ", callback_data: "ux:help:support" },
    ],
  ];
}

// Contextual hints — append after replies to expose next-step actions.
// Returns null when no useful hints for this surface (caller skips reply_markup).
export function buildContextualHints(
  surface: "status" | "campaign_created" | "fallback" | "examples" | "brand_changed",
  webAppUrl?: string,
): InlineKeyboard | null {
  switch (surface) {
    case "status":
      return [
        [
          { text: "💎 Mua thêm quota", url: "https://app.flowa.one/pricing" },
          { text: "📈 Xem báo cáo", url: "https://app.flowa.one/dashboard" },
        ],
      ];
    case "campaign_created":
      return [
        [
          { text: "📋 Duyệt ngay", url: "https://app.flowa.one/agent/approvals" },
          { text: "📅 Lịch đăng", url: "https://app.flowa.one/calendar" },
        ],
      ];
    case "fallback":
      return [
        [
          { text: "💡 Xem ví dụ", callback_data: "ux:welcome:examples" },
          { text: "📚 Hướng dẫn", callback_data: "ux:welcome:tutorial" },
        ],
      ];
    case "examples":
      return [
        [{ text: "🚀 Bắt đầu chat tự do", callback_data: "ux:hint:freechat" }],
      ];
    case "brand_changed":
      return [
        [{ text: "✍️ Tạo content với brand này", callback_data: "ux:welcome:generate" }],
      ];
    default:
      return null;
  }
}

// =====================================================
// Brand switcher — one-tap inline keyboard
// =====================================================

export interface BrandLite {
  id: string;
  brand_name: string;
  is_default?: boolean | null;
  primary_color?: string | null;
}

const BRANDS_PER_PAGE = 8;

/**
 * Map a hex color (e.g. "#A855F7") to the closest Telegram-renderable colored circle emoji.
 * Falls back to ⚪ for missing/invalid input.
 */
export function colorToEmoji(hex?: string | null): string {
  if (!hex) return "⚪";
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "⚪";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;

  if (max - min < 25) {
    if (l < 0.2) return "⚫";
    if (l > 0.85) return "⚪";
    return "⚫";
  }

  // Hue (deg)
  const d = max - min;
  let h = 0;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;

  if (h < 18 || h >= 345) return "🔴";
  if (h < 45) return "🟠";
  if (h < 70) return "🟡";
  if (h < 165) return "🟢";
  if (h < 200) return "🔵";
  if (h < 260) return "🔵";
  if (h < 310) return "🟣";
  return "🔴";
}

/**
 * Build the inline keyboard for the brand switcher.
 * - Active brand gets ✓
 * - Default brand gets 👑
 * - 8 brands per page; pagination row appears only when >8
 * - Trailing rows: [🔍 Tìm] [➕ Tạo brand] · [🚀 Mở Mini App]
 */
export function buildBrandSwitcherKeyboard(
  brands: BrandLite[],
  activeId: string | null,
  page = 0,
  opts: { webAppUrl?: string; appBaseUrl?: string } = {},
): InlineKeyboard {
  const totalPages = Math.max(1, Math.ceil(brands.length / BRANDS_PER_PAGE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * BRANDS_PER_PAGE;
  const slice = brands.slice(start, start + BRANDS_PER_PAGE);

  const rows: InlineKeyboard = [];
  // 2 per row
  for (let i = 0; i < slice.length; i += 2) {
    const row: InlineButton[] = [];
    for (const b of slice.slice(i, i + 2)) {
      const dot = colorToEmoji(b.primary_color);
      const crown = b.is_default ? "👑 " : "";
      const check = b.id === activeId ? " ✓" : "";
      const name = b.brand_name.length > 18 ? b.brand_name.slice(0, 17) + "…" : b.brand_name;
      row.push({
        text: `${dot} ${crown}${name}${check}`,
        callback_data: `brand:switch:${b.id}`,
      });
    }
    rows.push(row);
  }

  if (totalPages > 1) {
    const navRow: InlineButton[] = [];
    if (safePage > 0) navRow.push({ text: "« Trước", callback_data: `brand:page:${safePage - 1}` });
    navRow.push({ text: `${safePage + 1}/${totalPages}`, callback_data: "brand:noop" });
    if (safePage < totalPages - 1) navRow.push({ text: "Sau »", callback_data: `brand:page:${safePage + 1}` });
    rows.push(navRow);
  }

  const utilityRow: InlineButton[] = [
    { text: "🔍 Tìm brand…", callback_data: "brand:search" },
  ];
  if (opts.appBaseUrl) {
    utilityRow.push({ text: "➕ Tạo brand", url: `${opts.appBaseUrl}/brands` });
  }
  rows.push(utilityRow);

  if (opts.webAppUrl) {
    rows.push([{ text: "🚀 Quản lý brand đầy đủ", web_app: { url: `${opts.webAppUrl}/brands` } }]);
  }

  return rows;
}

/**
 * Compact reply_markup with a single "Đổi brand" button — appended to /status,
 * /generate, free-chat replies so the active brand stays one tap away.
 */
export function buildBrandFooterKeyboard(): InlineKeyboard {
  return [[{ text: "🎨 Đổi brand", callback_data: "brand:open" }]];
}

/**
 * Append "🎨 Brand: <name>" footer text. Caller controls parse_mode escaping.
 * Returns the original text untouched if brandName is empty.
 */
export function appendBrandFooter(text: string, brandName?: string | null): string {
  if (!brandName) return text;
  const sep = "\n\n─────────";
  return `${text}${sep}\n🎨 Brand: ${brandName}`;
}

// =====================================================
// Telegram Mini App: setChatMenuButton
// =====================================================
export async function setChatMenuButton(
  botToken: string,
  webAppUrl: string,
  text = "🚀 Mở Flowa",
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text,
          web_app: { url: webAppUrl },
        },
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[telegram-client] setChatMenuButton failed:", err);
    return { ok: false, description: String(err) };
  }
}

export async function setMyCommands(
  botToken: string,
  commands: BotCommand[] = BOT_COMMANDS,
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[telegram-client] setMyCommands failed:", err);
    return { ok: false, description: String(err) };
  }
}

// =====================================================
// Link-token: compact HMAC token for Telegram deep link.
// Telegram /start payload is capped, so we encode:
// [16 bytes uid][16 bytes org][4 bytes exp][8 bytes mac]
// Base64url output stays under the 64-char payload limit.
// =====================================================
function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") +
    "==".slice(0, (4 - (str.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface LinkTokenPayload {
  uid: string;
  org: string;
  exp: number;
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new Error("Invalid UUID");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error("Invalid UUID bytes");
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function signLinkToken(
  payload: Omit<LinkTokenPayload, "exp"> & { ttlSeconds?: number },
): Promise<string> {
  const secret = Deno.env.get("TELEGRAM_LINK_SECRET");
  if (!secret) throw new Error("TELEGRAM_LINK_SECRET not configured");

  const exp = Math.floor(Date.now() / 1000) + (payload.ttlSeconds ?? 600);
  const payloadBytes = new Uint8Array(36);
  payloadBytes.set(uuidToBytes(payload.uid), 0);
  payloadBytes.set(uuidToBytes(payload.org), 16);
  new DataView(payloadBytes.buffer).setUint32(32, exp, false);

  const key = await getHmacKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  const tokenBytes = new Uint8Array(44);
  tokenBytes.set(payloadBytes, 0);
  tokenBytes.set(signature.slice(0, 8), 36);

  return base64UrlEncode(tokenBytes);
}

export async function verifyLinkToken(
  token: string,
): Promise<LinkTokenPayload> {
  const secret = Deno.env.get("TELEGRAM_LINK_SECRET");
  if (!secret) throw new Error("TELEGRAM_LINK_SECRET not configured");

  let tokenBytes: Uint8Array;
  try {
    tokenBytes = base64UrlDecode(token);
  } catch {
    throw new Error("Malformed token");
  }
  if (tokenBytes.length !== 44) throw new Error("Malformed token");

  const payloadBytes = tokenBytes.slice(0, 36);
  const macBytes = tokenBytes.slice(36);
  const key = await getHmacKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  const expectedMac = signature.slice(0, 8);

  const valid = constantTimeEqual(macBytes, expectedMac);
  if (!valid) throw new Error("Invalid signature");

  const exp = new DataView(payloadBytes.buffer, payloadBytes.byteOffset, payloadBytes.byteLength)
    .getUint32(32, false);
  const payload: LinkTokenPayload = {
    uid: bytesToUuid(payloadBytes.slice(0, 16)),
    org: bytesToUuid(payloadBytes.slice(16, 32)),
    exp,
  };

  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    throw new Error("Token expired");
  }
  if (!payload.uid || !payload.org) {
    throw new Error("Invalid payload");
  }

  return payload;
}

// =====================================================
// Resolve bot config from path secret (multi-tenant webhook)
// organizationId is null for the Flowa-operated default bot sentinel row;
// callers must rehydrate it from telegram_chat_bindings in that case.
// =====================================================
// deno-lint-ignore no-explicit-any
export async function resolveBotConfig(supabase: any, webhookSecret: string) {
  const { data, error } = await supabase
    .from("telegram_bot_configs")
    .select(
      "id, organization_id, bot_username, bot_token_encrypted, default_autonomy_level, is_active, is_default",
    )
    .eq("webhook_secret", webhookSecret)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const botToken = await decryptCredential(data.bot_token_encrypted);
  return {
    id: data.id as string,
    organizationId: (data.organization_id as string | null) ?? null,
    botUsername: data.bot_username as string,
    botToken,
    defaultAutonomyLevel: data.default_autonomy_level as string,
    isDefault: (data.is_default as boolean | undefined) ?? false,
  };
}

// =====================================================
// Permission gate — reads agent_team_permissions + counts pipelines this month
// Mirrors logic in src/hooks/useAgentTeam.ts:38-56
// =====================================================
export type PermissionRejection =
  | { ok: false; code: "no_permission"; message: string }
  | { ok: false; code: "not_active"; message: string }
  | { ok: false; code: "cannot_create"; message: string }
  | { ok: false; code: "quota_exceeded"; message: string; used: number; limit: number };

export type PermissionOk = {
  ok: true;
  maxAutonomyLevel: string;
  pipelinesUsed: number;
  monthlyLimit: number | null;
};

export async function assertCanCreateGoal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  userId: string,
): Promise<PermissionOk | PermissionRejection> {
  const { data: permission, error: permError } = await supabase
    .from("agent_team_permissions")
    .select(
      "is_active, can_create_goals, max_autonomy_level, monthly_pipeline_limit",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (permError) throw permError;

  // Owner/admin của org luôn có full quyền Agent (không cần row trong agent_team_permissions)
  if (!permission) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (orgMember?.role === "owner" || orgMember?.role === "admin") {
      return {
        ok: true,
        maxAutonomyLevel: "full_auto",
        pipelinesUsed: 0,
        monthlyLimit: null,
      };
    }

    return {
      ok: false,
      code: "no_permission",
      message: "❌ Bạn chưa được cấp quyền Agent trong tổ chức này. Liên hệ admin để cấp quyền tại trang Agent Team.",
    };
  }
  if (!permission.is_active) {
    return {
      ok: false,
      code: "not_active",
      message: "❌ Quyền Agent của bạn đang tạm khóa. Liên hệ admin.",
    };
  }
  if (!permission.can_create_goals) {
    return {
      ok: false,
      code: "cannot_create",
      message: "❌ Bạn không có quyền tạo campaign mới.",
    };
  }

  let pipelinesUsed = 0;
  if (permission.monthly_pipeline_limit !== null) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data: pipelines, error: pipeError } = await supabase
      .from("agent_pipelines")
      .select("id, goal_id, agent_goals!agent_pipelines_goal_id_fkey(created_by)")
      .eq("organization_id", organizationId)
      .gte("created_at", startOfMonth.toISOString());

    if (pipeError) throw pipeError;

    pipelinesUsed = (pipelines ?? []).filter(
      // deno-lint-ignore no-explicit-any
      (p: any) => p.agent_goals?.created_by === userId,
    ).length;

    if (pipelinesUsed >= permission.monthly_pipeline_limit) {
      return {
        ok: false,
        code: "quota_exceeded",
        message:
          `❌ Bạn đã dùng hết quota ${permission.monthly_pipeline_limit} pipeline tháng này.`,
        used: pipelinesUsed,
        limit: permission.monthly_pipeline_limit,
      };
    }
  }

  return {
    ok: true,
    maxAutonomyLevel: permission.max_autonomy_level,
    pipelinesUsed,
    monthlyLimit: permission.monthly_pipeline_limit,
  };
}
