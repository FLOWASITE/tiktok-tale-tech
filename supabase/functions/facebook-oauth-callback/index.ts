import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decrypt as decryptGCM, encrypt as encryptGCM } from "../_shared/crypto.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Legacy CBC decrypt for backward compatibility
function decryptLegacyCBC(encryptedText: string, key: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const keyBuffer = Buffer.alloc(32);
  Buffer.from(key).copy(keyBuffer);
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function decryptCredential(ciphertext: string): Promise<string> {
  try {
    const result = await decryptGCM(ciphertext);
    if (result) return result;
  } catch { /* fallback */ }

  const encryptionKey = Deno.env.get('AI_ENCRYPTION_KEY') || 'default-key';
  const keyCandidates = [encryptionKey, 'default-encryption-key-change-me', 'default-key'];
  for (const candidate of keyCandidates) {
    try {
      const result = decryptLegacyCBC(ciphertext, candidate);
      if (result) return result;
    } catch { /* try next */ }
  }
  throw new Error('Failed to decrypt credential with any method');
}

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^https:\/\/(app\.)?flowa\.(one|vn)$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
}

function getFrontendUrl(stateOrigin?: string | null): string {
  if (stateOrigin && isAllowedOrigin(stateOrigin)) return stateOrigin;
  const configured = Deno.env.get('FRONTEND_URL');
  if (configured) return configured;
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovableproject.com');
}

Deno.serve(withPerf({ functionName: 'facebook-oauth-callback' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('Facebook OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

    if (error) {
      let errorOrigin: string | null = null;
      try { if (state) errorOrigin = JSON.parse(atob(state)).frontendOrigin; } catch { /* ignore */ }
      return Response.redirect(
        `${getFrontendUrl(errorOrigin)}/auth/facebook/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302
      );
    }

    if (!code || !state) throw new Error('Missing code or state parameter');

    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error('Invalid state parameter');
    }

    const { brandTemplateId, organizationId, userId, frontendOrigin } = stateData;
    console.log('State decoded:', { brandTemplateId, organizationId, userId });

    const supabase = getServiceClient();

    const { data: settings, error: settingsError } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret')
      .eq('platform', 'facebook')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      throw new Error('Facebook credentials not configured in Admin Settings');
    }

    const appId = await decryptCredential(settings.consumer_key);
    const appSecret = await decryptCredential(settings.consumer_secret);
    if (!appId || !appSecret) throw new Error('Failed to decrypt Facebook credentials');

    const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;

    // Exchange code for short-lived user token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` + new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      })
    );
    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      throw new Error(`Failed to exchange code: ${tokenError}`);
    }
    const tokenData = await tokenResponse.json();

    // Long-lived user token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenData.access_token,
      })
    );
    if (!longLivedResponse.ok) {
      const llError = await longLivedResponse.text();
      throw new Error(`Failed to get long-lived token: ${llError}`);
    }
    const longLivedData = await longLivedResponse.json();
    const userAccessToken = longLivedData.access_token;

    // Fetch user's Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?` + new URLSearchParams({
        access_token: userAccessToken,
        fields: 'id,name,access_token,category,picture,fan_count,followers_count',
        limit: '100',
      })
    );
    if (!pagesResponse.ok) {
      const pagesError = await pagesResponse.text();
      throw new Error(`Failed to fetch Pages: ${pagesError}`);
    }
    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];
    console.log(`Found ${pages.length} Pages`);

    if (pages.length === 0) {
      return Response.redirect(
        `${getFrontendUrl(frontendOrigin)}/auth/facebook/callback?error=no_pages&error_description=${encodeURIComponent('Không tìm thấy Facebook Page nào. Bạn cần có quyền quản lý ít nhất một Page.')}&brand_template_id=${brandTemplateId || ''}`,
        302
      );
    }

    // Encrypt user token + create session for picker
    const encryptedUserToken = await encryptGCM(userAccessToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Strip page access tokens before sending to UI; keep them server-side only
    const sanitizedPages = pages.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture: p.picture?.data?.url || null,
      fan_count: p.fan_count ?? null,
      followers_count: p.followers_count ?? null,
      // Encrypted page token kept inside session (never exposed to client)
      _enc_token: null,
    }));

    // Store the FULL pages payload (with raw tokens) inside session for attach step
    const fullPages = pages.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture: p.picture?.data?.url || null,
      fan_count: p.fan_count ?? null,
      followers_count: p.followers_count ?? null,
      access_token: p.access_token, // raw — stays in DB protected by RLS
    }));

    const { data: session, error: sessionError } = await supabase
      .from('facebook_oauth_sessions')
      .insert({
        user_id: userId,
        organization_id: organizationId || null,
        brand_template_id: brandTemplateId || null,
        encrypted_user_token: encryptedUserToken,
        pages: fullPages,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('Failed to create OAuth session:', sessionError);
      throw new Error('Failed to persist OAuth session');
    }

    const redirectParams: Record<string, string> = {
      session_id: session.id,
      pages_count: String(pages.length),
      platform: 'facebook',
    };
    if (brandTemplateId) redirectParams.brand_template_id = brandTemplateId;
    const successUrl = `${getFrontendUrl(frontendOrigin)}/auth/facebook/callback?` + new URLSearchParams(redirectParams).toString();

    console.log('Redirecting to picker:', successUrl);
    return Response.redirect(successUrl, 302);

  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(
      `${getFrontendUrl(null)}/auth/facebook/callback?error=callback_failed&error_description=${encodeURIComponent(errorMessage)}`,
      302
    );
  }
}));
