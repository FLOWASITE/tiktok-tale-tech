// Shared Shopify helpers for OAuth and Admin API calls.
// API version pinned for stability — bump when migrating.

export const SHOPIFY_API_VERSION = "2025-01";

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]{0,59}\.myshopify\.com$/i;

export function validateShopDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  const shop = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return SHOP_DOMAIN_RE.test(shop) ? shop : null;
}

/**
 * Verify Shopify HMAC on OAuth callback query params.
 * Shopify computes HMAC over query string sorted alphabetically, excluding `hmac` and `signature`.
 * Constant-time compare.
 */
export async function verifyOAuthHmac(url: URL, clientSecret: string): Promise<boolean> {
  const hmacReceived = url.searchParams.get("hmac");
  if (!hmacReceived) return false;

  const params: [string, string][] = [];
  url.searchParams.forEach((v, k) => {
    if (k !== "hmac" && k !== "signature") params.push([k, v]);
  });
  params.sort(([a], [b]) => a.localeCompare(b));
  const message = params.map(([k, v]) => `${k}=${v}`).join("&");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return constantTimeEqual(sigHex, hmacReceived.toLowerCase());
}

/**
 * Verify Shopify Webhook HMAC (header X-Shopify-Hmac-Sha256, base64).
 * @param rawBody raw request body bytes
 */
export async function verifyWebhookHmac(rawBody: Uint8Array, hmacHeader: string, clientSecret: string): Promise<boolean> {
  if (!hmacHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, rawBody);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return constantTimeEqual(sigB64, hmacHeader);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Call Shopify Admin REST API. */
export async function shopifyFetch(
  shop: string,
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  return await fetch(url, { ...init, headers });
}

export async function getShopInfo(shop: string, accessToken: string): Promise<{
  name: string; email: string; domain: string; myshopify_domain: string; primary_locale: string;
}> {
  const res = await shopifyFetch(shop, accessToken, "/shop.json");
  if (!res.ok) throw new Error(`shop.json failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.shop;
}

export async function listBlogs(shop: string, accessToken: string): Promise<Array<{ id: number; title: string; handle: string }>> {
  const res = await shopifyFetch(shop, accessToken, "/blogs.json");
  if (!res.ok) throw new Error(`blogs.json failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.blogs || [];
}

/**
 * Register an app uninstalled webhook so Flowa can clean up on merchant offboarding.
 * Idempotent — Shopify returns 422 if topic already subscribed; we ignore it.
 */
export async function registerUninstallWebhook(
  shop: string,
  accessToken: string,
  callbackUrl: string,
): Promise<void> {
  try {
    const res = await shopifyFetch(shop, accessToken, "/webhooks.json", {
      method: "POST",
      body: JSON.stringify({
        webhook: { topic: "app/uninstalled", address: callbackUrl, format: "json" },
      }),
    });
    if (!res.ok && res.status !== 422) {
      console.warn("[shopify] register uninstall webhook failed:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[shopify] register uninstall webhook error:", e);
  }
}
