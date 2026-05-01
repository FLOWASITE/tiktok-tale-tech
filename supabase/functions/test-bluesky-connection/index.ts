import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLUESKY_PDS = 'https://bsky.social';

interface DiagnosticStep {
  step: string;
  status: 'ok' | 'fail' | 'skip';
  latencyMs: number;
  detail?: string;
}

Deno.serve(withPerf({ functionName: 'test-bluesky-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const diagnostics: DiagnosticStep[] = [];
  const startTotal = Date.now();

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'connectionId is required', errorCode: 'MISSING_PARAM' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch connection from DB
    let stepStart = Date.now();
    const { data: connection, error: dbError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'bluesky')
      .single();

    if (dbError || !connection) {
      diagnostics.push({ step: 'db_lookup', status: 'fail', latencyMs: Date.now() - stepStart, detail: dbError?.message || 'Connection not found' });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Không tìm thấy kết nối Bluesky. Vui lòng kết nối lại.',
          errorCode: 'CONNECTION_NOT_FOUND',
          diagnostics,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    diagnostics.push({ step: 'db_lookup', status: 'ok', latencyMs: Date.now() - stepStart });

    // Step 2: Decrypt credentials
    stepStart = Date.now();
    let handle: string | null = null;
    let appPassword: string | null = null;
    try {
      handle = await decryptCredential(connection.access_token);
      appPassword = await decryptCredential(connection.refresh_token);
    } catch (decryptErr) {
      diagnostics.push({ step: 'decrypt', status: 'fail', latencyMs: Date.now() - stepStart, detail: 'Decryption failed' });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Không thể giải mã thông tin đăng nhập Bluesky. Vui lòng kết nối lại.',
          errorCode: 'DECRYPT_FAILED',
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!handle || !appPassword) {
      diagnostics.push({ step: 'decrypt', status: 'fail', latencyMs: Date.now() - stepStart, detail: 'Empty credentials after decrypt' });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Thông tin đăng nhập Bluesky trống. Vui lòng kết nối lại với handle và App Password.',
          errorCode: 'EMPTY_CREDENTIALS',
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    diagnostics.push({ step: 'decrypt', status: 'ok', latencyMs: Date.now() - stepStart });

    // Step 3: PDS reachability check
    stepStart = Date.now();
    try {
      const healthRes = await fetch(`${BLUESKY_PDS}/xrpc/_health`, { signal: AbortSignal.timeout(5000) });
      const healthText = await healthRes.text();
      if (!healthRes.ok) {
        diagnostics.push({ step: 'pds_health', status: 'fail', latencyMs: Date.now() - stepStart, detail: `PDS returned ${healthRes.status}` });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Máy chủ Bluesky (bsky.social) đang gặp sự cố. Vui lòng thử lại sau.',
            errorCode: 'PDS_UNREACHABLE',
            transient: true,
            diagnostics,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      diagnostics.push({ step: 'pds_health', status: 'ok', latencyMs: Date.now() - stepStart });
    } catch (healthErr) {
      diagnostics.push({ step: 'pds_health', status: 'fail', latencyMs: Date.now() - stepStart, detail: (healthErr as Error).message });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Không thể kết nối tới máy chủ Bluesky. Kiểm tra lại mạng hoặc thử sau.',
          errorCode: 'PDS_TIMEOUT',
          transient: true,
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Authenticate with AT Protocol
    stepStart = Date.now();
    const authRes = await fetch(`${BLUESKY_PDS}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (authRes.status === 401) {
      const errBody = await authRes.text();
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: 'Invalid credentials (401)' });

      // Update connection with error
      await supabase
        .from('social_connections')
        .update({ last_error: 'App Password invalid or revoked', last_verified_at: new Date().toISOString() })
        .eq('id', connectionId);

      return new Response(
        JSON.stringify({
          success: false,
          needs_reauth: true,
          error: 'App Password không hợp lệ hoặc đã bị thu hồi. Vui lòng tạo App Password mới tại bsky.app/settings/app-passwords và kết nối lại.',
          errorCode: 'AUTH_INVALID',
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (authRes.status === 429) {
      await authRes.text();
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: 'Rate limited (429)' });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bluesky đang giới hạn tốc độ. Vui lòng thử lại sau 1-2 phút.',
          errorCode: 'RATE_LIMITED',
          transient: true,
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authRes.ok) {
      const txt = await authRes.text();
      diagnostics.push({ step: 'auth', status: 'fail', latencyMs: Date.now() - stepStart, detail: `API ${authRes.status}: ${txt.slice(0, 100)}` });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Bluesky xác thực thất bại (HTTP ${authRes.status}). ${txt.slice(0, 100)}`,
          errorCode: 'AUTH_ERROR',
          diagnostics,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await authRes.json();
    diagnostics.push({ step: 'auth', status: 'ok', latencyMs: Date.now() - stepStart, detail: `DID: ${session.did}` });

    // Step 5: Fetch profile
    stepStart = Date.now();
    let profile: any = {};
    try {
      const profileRes = await fetch(
        `${BLUESKY_PDS}/xrpc/app.bsky.actor.getProfile?actor=${session.did}`,
        { headers: { 'Authorization': `Bearer ${session.accessJwt}` }, signal: AbortSignal.timeout(5000) }
      );
      if (profileRes.ok) {
        profile = await profileRes.json();
        diagnostics.push({ step: 'profile', status: 'ok', latencyMs: Date.now() - stepStart });
      } else {
        await profileRes.text();
        diagnostics.push({ step: 'profile', status: 'fail', latencyMs: Date.now() - stepStart, detail: `Profile API ${profileRes.status}` });
      }
    } catch (profileErr) {
      diagnostics.push({ step: 'profile', status: 'fail', latencyMs: Date.now() - stepStart, detail: (profileErr as Error).message });
    }

    // Step 6: Update connection record
    stepStart = Date.now();
    await supabase
      .from('social_connections')
      .update({
        last_verified_at: new Date().toISOString(),
        last_error: null,
        platform_user_id: session.did,
        platform_username: session.handle,
        platform_display_name: profile.displayName || session.handle,
        platform_avatar_url: profile.avatar || null,
      })
      .eq('id', connectionId);
    diagnostics.push({ step: 'db_update', status: 'ok', latencyMs: Date.now() - stepStart });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          username: session.handle,
          name: profile.displayName || session.handle,
          avatar: profile.avatar,
          did: session.did,
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
