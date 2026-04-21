// Verify Telegram WebApp initData via HMAC and mint a Supabase session
// for the linked Flowa user. Supports both BYOB bots and the Flowa
// default bot (sentinel row with organization_id IS NULL + is_default).

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
  organization_id?: string | null;
}

Deno.serve(withPerf({ functionName: "telegram-webapp-auth" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as Body;
    const initData = String(body.init_data || "").trim();
    let orgId = String(body.organization_id || "").trim() || null;
    if (!initData) return json({ error: "init_data is required" }, 400);

    const supabase = getServiceClient();

    // 1. Parse initData (need user.id BEFORE bot lookup so we can infer org)
    const params = new URLSearchParams(initData);
    const hash = params.get("hash") || "";
    if (!hash) return json({ error: "missing hash" }, 401);

    let tgUser: { id: number } | null = null;
    try {
      tgUser = JSON.parse(params.get("user") || "null");
    } catch { /* ignore */ }
    if (!tgUser?.id) return json({ error: "no user in initData" }, 401);

    // 2. Infer org from bindings if not provided
    if (!orgId) {
      const { data: bindings, error: bindErr } = await supabase
        .from("telegram_chat_bindings")
        .select("organization_id")
        .eq("telegram_user_id", tgUser.id)
        .eq("chat_type", "private")
        .eq("is_active", true);
      if (bindErr) throw bindErr;
      const rows = (bindings as { organization_id: string }[] | null) || [];
      const uniq = Array.from(new Set(rows.map((r) => r.organization_id)));
      if (uniq.length === 0) {
        return json({
          error: "Tài khoản Telegram chưa liên kết với tổ chức nào. Hãy /start trong DM với bot trước.",
          code: "not_linked",
        }, 404);
      }
      if (uniq.length > 1) {
        return json({
          error: "Tài khoản liên kết nhiều tổ chức. Mở Mini App từ menu bot có gắn ?org=<id>.",
          code: "ambiguous_org",
        }, 409);
      }
      orgId = uniq[0];
    }

    // 3. Resolve bot config: BYOB by org → fallback default sentinel
    let { data: cfg, error: cfgErr } = await supabase
      .from("telegram_bot_configs")
      .select("bot_token_encrypted, is_active")
      .eq("organization_id", orgId)
      .maybeSingle();
    if (cfgErr) throw cfgErr;

    if (!cfg || !(cfg as { is_active: boolean }).is_active) {
      const { data: defaultBot } = await supabase
        .from("telegram_bot_configs")
        .select("bot_token_encrypted, is_active")
        .is("organization_id", null)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      cfg = (defaultBot as typeof cfg) ?? null;
    }

    if (!cfg) {
      return json({ error: "Không tìm thấy bot khả dụng cho tổ chức này" }, 404);
    }
    const botToken = await decryptCredential((cfg as { bot_token_encrypted: string }).bot_token_encrypted);

    // 4. Validate initData HMAC with resolved bot token
    params.delete("hash");
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
      console.warn("[webapp-auth] HMAC mismatch", { orgId });
      return json({ error: "invalid initData signature" }, 401);
    }

    // 5. auth_date freshness
    const authDate = Number(params.get("auth_date") || "0");
    if (!authDate || (Date.now() / 1000 - authDate) > 86400) {
      return json({ error: "initData expired" }, 401);
    }

    // 6. Resolve Flowa user via DM binding (org + tg user)
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
        error: "Tài khoản Telegram chưa được liên kết với tổ chức này. Hãy /start trong DM với bot.",
        code: "not_linked",
      }, 404);
    }

    // 7. Mint magic link → return token_hash to frontend
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    // Compatibility: do NOT return `email`. Older cached frontend bundles passed
    // `email` to supabase.auth.verifyOtp, which Supabase rejects with
    // "Only the token_hash and type should be provided" (400). By omitting email
    // here, both old and new bundles can verify the magic link successfully.
    return json({
      ok: true,
      user_id: userId,
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
