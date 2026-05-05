// Helper: load GSC OAuth client credentials từ social_platform_settings (BYOK)
import { decrypt } from "./crypto.ts";

export const GSC_REDIRECT_URI = `https://rllyipiyuptkibqinotz.supabase.co/functions/v1/gsc-oauth-callback`;
export const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function getGscClientCredentials(serviceClient: any): Promise<{ clientId: string; clientSecret: string }> {
  const { data, error } = await serviceClient
    .from("social_platform_settings")
    .select("consumer_key, consumer_secret, is_active")
    .eq("platform", "google_search_console")
    .single();
  if (error || !data) throw new Error("GSC chưa được cấu hình. Hãy vào Admin → Social Settings → Google Search Console để thêm Client ID/Secret.");
  if (!data.is_active) throw new Error("GSC settings đang tạm dừng.");
  if (!data.consumer_key || !data.consumer_secret) throw new Error("GSC Client ID/Secret bị thiếu.");
  const [clientId, clientSecret] = await Promise.all([
    decrypt(data.consumer_key),
    decrypt(data.consumer_secret),
  ]);
  return { clientId, clientSecret };
}

export async function refreshGscAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${JSON.stringify(json)}`);
  return json;
}

export async function getValidAccessToken(serviceClient: any, connection: any): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expiresAt - 60_000 > Date.now()) return connection.access_token;
  const { clientId, clientSecret } = await getGscClientCredentials(serviceClient);
  const refreshed = await refreshGscAccessToken(connection.refresh_token, clientId, clientSecret);
  const newExpires = new Date(Date.now() + (refreshed.expires_in * 1000)).toISOString();
  await serviceClient
    .from("gsc_connections")
    .update({ access_token: refreshed.access_token, token_expires_at: newExpires })
    .eq("id", connection.id);
  return refreshed.access_token;
}
