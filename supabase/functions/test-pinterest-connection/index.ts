import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-pinterest-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'pinterest')
      .single();

    if (error || !connection) throw new Error('Pinterest connection not found');

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Failed to decrypt access token');

    const res = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 401) {
      return new Response(
        JSON.stringify({
          success: false,
          needs_reauth: true,
          error: 'Token hết hạn hoặc bị thu hồi. Vui lòng kết nối lại.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Pinterest API ${res.status}: ${txt.slice(0, 200)}`);
    }

    const me = await res.json();

    await supabase
      .from('social_connections')
      .update({ last_verified_at: new Date().toISOString(), last_error: null })
      .eq('id', connectionId);

    return new Response(
      JSON.stringify({
        success: true,
        username: me.username,
        account_type: me.account_type,
        profile_image: me.profile_image,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[test-pinterest-connection] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
