// Verify Telegram WebApp initData via HMAC and mint a Supabase session
// for the linked Flowa user. Returns access/refresh tokens for the SDK.
//
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  init_data: string;
  organization_id: string;
}

Deno.serve(withPerf({ functionName: "telegram-webapp-auth" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as Body;
    const initData = String(body.init_data || "").trim();
    const orgId = String(body.organization_id || "").trim();
    if (!initData) return json({ error: "init_data is required" }, 400);
    if (!orgId) return json({ error: "organization_id is required" }, 400);

    const supabase = getServiceClient();

    // 1. Resolve org's bot token (used as HMAC secret material)
    const { data: cfg, error: cfgErr } = await supabase
      .from("telegram_bot_configs")
      .select("bot_token_encrypted, is_active")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!cfg || !(cfg as { is_active: boolean }).is_active) {
      return json({ error: "Bot chưa được cấu hình cho tổ chức này" }, 404);
    }
    const botToken = await decryptCredential((cfg as { bot_token_encrypted: string }).bot_token_encrypted);

    // 2. Validate initData HMAC
    const params = new URLSearchParams(initData);
    const hash = params.get("hash") || "";
    params.delete("hash");
    if (!hash) return json({ error: "missing hash" }, 401);

    const dataCheckArr: string[] = [];
    Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => dataCheckArr.push(`${k}=${v}`));
    const dataCheckString = dataCheckArr.join("\n");

    const enc = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      enc.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const secretBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", secretKey, enc.encode(botToken)),
    );
    const signKey = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", signKey, enc.encode(dataCheckString)),
    );
    const computed = Array.from(sigBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computed !== hash) {
      console.warn("[webapp-auth] HMAC mismatch");
      return json({ error: "invalid initData signature" }, 401);
    }

    // 3. Optional auth_date freshness check (24h)
    const authDate = Number(params.get("auth_date") || "0");
    if (!authDate || (Date.now() / 1000 - authDate) > 86400) {
      return json({ error: "initData expired" }, 401);
    }

    // 4. Parse Telegram user
    let tgUser: { id: number } | null = null;
    try {
      tgUser = JSON.parse(params.get("user") || "null");
    } catch { /* ignore */ }
    if (!tgUser?.id) return json({ error: "no user in initData" }, 401);

    // 5. Look up Flowa user via DM binding
    const { data: binding } = await supabase
      .from("telegram_chat_bindings")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("telegram_user_id", tgUser.id)
      .eq("chat_type", "private")
      .eq("is_active", true)
      .maybeSingle();
    const userId = (binding as { user_id: string } | null)?.user_id;
    if (!userId) {
      return json({
        error: "Tài khoản Telegram chưa được liên kết. Hãy /start trong DM với bot trước.",
        code: "not_linked",
      }, 404);
    }

    // 6. Mint a session via admin API: get user, generate magic link, exchange.
    // Simpler approach: return a short-lived signed payload the frontend uses
    // with `signInWithOtp`-equivalent. Easiest reliable path = generate magic link
    // and return its hashed_token so the client can call `verifyOtp`.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve email from auth.users via profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const email = (profile as { email: string } | null)?.email;
    if (!email) return json({ error: "user email not found" }, 404);

    const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link) {
      console.error("[webapp-auth] generateLink failed:", linkErr);
      return json({ error: "Không tạo được session" }, 500);
    }

    return json({
      ok: true,
      user_id: userId,
      email,
      // Frontend will exchange `hashed_token` via supabase.auth.verifyOtp({type:'magiclink', token_hash})
      token_hash: link.properties?.hashed_token,
      organization_id: orgId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webapp-auth] fatal:", msg);
    return json({ error: msg }, 500);
  }
}));

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
