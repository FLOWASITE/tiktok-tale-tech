import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-bluesky-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'bluesky')
      .single();

    if (error || !connection) throw new Error('Bluesky connection not found');

    const handle = await decryptCredential(connection.access_token);
    const appPassword = await decryptCredential(connection.refresh_token);

    if (!handle || !appPassword) throw new Error('Failed to decrypt Bluesky credentials');

    // Try to create a session to verify credentials
    const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (res.status === 401) {
      return new Response(
        JSON.stringify({
          success: false,
          needs_reauth: true,
          error: 'App Password không hợp lệ hoặc đã bị thu hồi. Vui lòng tạo App Password mới tại bsky.app/settings/app-passwords và kết nối lại.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Bluesky API ${res.status}: ${txt.slice(0, 200)}`);
    }

    const session = await res.json();

    // Get profile info
    const profileRes = await fetch(
      `https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${session.did}`,
      { headers: { 'Authorization': `Bearer ${session.accessJwt}` } }
    );

    let profile: any = {};
    if (profileRes.ok) {
      profile = await profileRes.json();
    } else {
      await profileRes.text(); // consume body
    }

    // Update connection verification
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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          username: session.handle,
          name: profile.displayName || session.handle,
          avatar: profile.avatar,
          did: session.did,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[test-bluesky-connection] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
