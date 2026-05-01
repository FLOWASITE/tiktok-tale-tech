import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";
import {
  importDpopPrivateJwk,
  refreshAccessToken,
  pdsFetch,
  type AuthServerMetadata,
  type DpopKey,
} from "../_shared/bluesky-oauth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticStep {
  step: string;
  status: 'ok' | 'fail' | 'skip';
  latencyMs: number;
  detail?: string;
}

const PUBLIC_APPVIEW = 'https://public.api.bsky.app';

Deno.serve(withPerf({ functionName: 'test-bluesky-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const diagnostics: DiagnosticStep[] = [];
  const startTotal = Date.now();
  const supabase = getServiceClient();

  const fail = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify({ ...body, diagnostics, totalLatencyMs: Date.now() - startTotal }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { connectionId } = await req.json();
    if (!connectionId) {
      return fail(400, { success: false, error: 'connectionId is required', errorCode: 'MISSING_PARAM' });
    }

    // Step 1: Fetch connection
    let stepStart = Date.now();
    const { data: connection, error: dbError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'bluesky')
      .single();

    if (dbError || !connection) {
      diagnostics.push({ step: 'db_lookup', status: 'fail', latencyMs: Date.now() - stepStart, detail: dbError?.message || 'Connection not found' });
      return fail(404, {
        success: false,
        error: 'Không tìm thấy kết nối Bluesky. Vui lòng kết nối lại.',
        errorCode: 'CONNECTION_NOT_FOUND',
      });
    }
    diagnostics.push({ step: 'db_lookup', status: 'ok', latencyMs: Date.now() - stepStart });

    const meta = (connection.metadata as Record<string, any>) || {};
    const isOAuth = meta.oauth_version === 2 || (meta.dpop_jwk_encrypted && meta.token_endpoint && meta.pds_url);

    // Step 2: Detect legacy App Password connection
    if (!isOAuth) {
      const legacyMsg = 'Kết nối Bluesky cũ (App Password) không còn được hỗ trợ. Vui lòng ngắt và kết nối lại bằng OAuth.';
      diagnostics.push({ step: 'detect_oauth', status: 'fail', latencyMs: 0, detail: 'missing OAuth metadata' });
      await supabase
        .from('social_connections')
        .update({ last_error: legacyMsg, last_verified_at: new Date().toISOString(), is_active: false })
        .eq('id', connectionId);
      return fail(200, {
        success: false,
        needs_reauth: true,
        error: legacyMsg,
        errorCode: 'LEGACY_APP_PASSWORD',
      });
    }
    diagnostics.push({ step: 'detect_oauth', status: 'ok', latencyMs: 0 });

    // Step 3: Decrypt DPoP key + access token
    stepStart = Date.now();
    let dpopKey: DpopKey;
    let accessToken: string;
    let refreshTokenPlain: string | null = null;
    try {
      const dpopJwkPlain = await decrypt(meta.dpop_jwk_encrypted);
      dpopKey = await importDpopPrivateJwk(JSON.parse(dpopJwkPlain));
      accessToken = await decrypt(connection.access_token);
      if (connection.refresh_token) {
        refreshTokenPlain = await decrypt(connection.refresh_token);
      }
    } catch (decryptErr) {
      diagnostics.push({ step: 'decrypt', status: 'fail', latencyMs: Date.now() - stepStart, detail: (decryptErr as Error).message });
      const msg = 'Không thể giải mã thông tin OAuth. Vui lòng ngắt và kết nối lại Bluesky.';
      await supabase.from('social_connections').update({ last_error: msg, last_verified_at: new Date().toISOString() }).eq('id', connectionId);
      return fail(200, { success: false, needs_reauth: true, error: msg, errorCode: 'DECRYPT_FAILED' });
    }
    diagnostics.push({ step: 'decrypt', status: 'ok', latencyMs: Date.now() - stepStart });

    const did: string = meta.did || connection.platform_user_id;
    const pdsUrl: string = String(meta.pds_url).replace(/\/$/, '');
    let dpopNonce: string | undefined = meta.dpop_nonce || undefined;

    // Step 4: Optional silent refresh if expiring within 60s
    const expiresAtMs = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
    const expiringSoon = !expiresAtMs || (expiresAtMs - Date.now() < 60_000);

    const tryRefresh = async (): Promise<boolean> => {
      if (!refreshTokenPlain) return false;
      const refreshStart = Date.now();
      try {
        const authServer: AuthServerMetadata = {
          issuer: meta.authz_issuer,
          authorization_endpoint: '',
          token_endpoint: meta.token_endpoint,
          pushed_authorization_request_endpoint: '',
        };
        const newToken = await refreshAccessToken({
          authServer, refreshToken: refreshTokenPlain, dpopKey, initialNonce: dpopNonce,
        });
        accessToken = newToken.access_token;
        refreshTokenPlain = newToken.refresh_token;
        dpopNonce = newToken.dpop_nonce || dpopNonce;
        await supabase.from('social_connections').update({
          access_token: await encrypt(newToken.access_token),
          refresh_token: await encrypt(newToken.refresh_token),
          token_expires_at: new Date(newToken.expires_at).toISOString(),
          metadata: { ...meta, dpop_nonce: dpopNonce },
        }).eq('id', connectionId);
        diagnostics.push({ step: 'token_refresh', status: 'ok', latencyMs: Date.now() - refreshStart });
        return true;
      } catch (refreshErr) {
        diagnostics.push({ step: 'token_refresh', status: 'fail', latencyMs: Date.now() - refreshStart, detail: (refreshErr as Error).message });
        return false;
      }
    };

    if (expiringSoon) {
      await tryRefresh();
    }

    // Step 5: Validate via authenticated PDS getProfile
    stepStart = Date.now();
    const profileUrl = `${pdsUrl}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
    let { response: profileRes, newNonce } = await pdsFetch({
      url: profileUrl, method: 'GET', accessToken, dpopKey, nonce: dpopNonce,
    });
    if (newNonce) dpopNonce = newNonce;

    // Retry once with refresh on 401
    if (profileRes.status === 401 && refreshTokenPlain) {
      diagnostics.push({ step: 'auth_initial', status: 'fail', latencyMs: Date.now() - stepStart, detail: '401 — attempting refresh' });
      const refreshed = await tryRefresh();
      if (refreshed) {
        const retry = await pdsFetch({ url: profileUrl, method: 'GET', accessToken, dpopKey, nonce: dpopNonce });
        profileRes = retry.response;
        if (retry.newNonce) dpopNonce = retry.newNonce;
      }
    }

    if (profileRes.status === 401) {
      const txt = await profileRes.text().catch(() => '');
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: `401 ${txt.slice(0, 120)}` });
      const msg = 'Phiên đăng nhập Bluesky đã hết hạn. Vui lòng kết nối lại.';
      await supabase.from('social_connections').update({
        last_error: msg, last_verified_at: new Date().toISOString(),
      }).eq('id', connectionId);
      return fail(200, { success: false, needs_reauth: true, error: msg, errorCode: 'AUTH_EXPIRED' });
    }

    if (profileRes.status === 429) {
      await profileRes.text().catch(() => '');
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: '429 rate limited' });
      // Do NOT persist last_error for transient
      return fail(200, {
        success: false,
        transient: true,
        error: 'Bluesky đang giới hạn tốc độ. Vui lòng thử lại sau 1-2 phút.',
        errorCode: 'RATE_LIMITED',
      });
    }

    if (!profileRes.ok) {
      const txt = await profileRes.text().catch(() => '');
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: `HTTP ${profileRes.status}: ${txt.slice(0, 120)}` });
      // Transient PDS error — don't persist last_error
      return fail(200, {
        success: false,
        transient: true,
        error: `Bluesky trả về HTTP ${profileRes.status}. Thử lại sau.`,
        errorCode: 'PDS_ERROR',
      });
    }

    const profile = await profileRes.json();
    diagnostics.push({ step: 'auth', status: 'ok', latencyMs: Date.now() - stepStart, detail: `DID: ${did}` });

    // Step 6: Persist success — clear last_error
    stepStart = Date.now();
    await supabase
      .from('social_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
        platform_username: profile.handle || connection.platform_username,
        platform_display_name: profile.displayName || profile.handle || connection.platform_display_name,
        platform_avatar_url: profile.avatar || connection.platform_avatar_url,
        metadata: { ...meta, dpop_nonce: dpopNonce },
        is_active: true,
      })
      .eq('id', connectionId);
    diagnostics.push({ step: 'db_update', status: 'ok', latencyMs: Date.now() - stepStart });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          username: profile.handle,
          name: profile.displayName || profile.handle,
          avatar: profile.avatar,
          did,
          followersCount: profile.followersCount,
          postsCount: profile.postsCount,
        },
        diagnostics,
        totalLatencyMs: Date.now() - startTotal,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[test-bluesky-connection] error:', err);
    diagnostics.push({ step: 'unknown', status: 'fail', latencyMs: Date.now() - startTotal, detail: (err as Error).message });
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Lỗi không xác định',
        errorCode: 'INTERNAL_ERROR',
        diagnostics,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
