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
      allowed_updates: ["message"],
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

  const tokenBytes = base64UrlDecode(token);
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
// =====================================================
// deno-lint-ignore no-explicit-any
export async function resolveBotConfig(supabase: any, webhookSecret: string) {
  const { data, error } = await supabase
    .from("telegram_bot_configs")
    .select(
      "id, organization_id, bot_username, bot_token_encrypted, default_autonomy_level, is_active",
    )
    .eq("webhook_secret", webhookSecret)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const botToken = await decryptCredential(data.bot_token_encrypted);
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    botUsername: data.bot_username as string,
    botToken,
    defaultAutonomyLevel: data.default_autonomy_level as string,
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

  if (!permission) {
    return {
      ok: false,
      code: "no_permission",
      message: "❌ Bạn chưa được cấp quyền Agent trong tổ chức này.",
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
