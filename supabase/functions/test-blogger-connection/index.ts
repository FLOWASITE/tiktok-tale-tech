import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshIfNeeded(connectionId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  await fetch(`${supabaseUrl}/functions/v1/refresh-blogger-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ connectionId }),
  });
}

Deno.serve(withPerf({ functionName: 'test-blogger-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    let { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'blogger')
      .single();

    if (!connection) throw new Error('Connection not found');

    // Refresh if expiring soon (<10 min)
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 10 * 60 * 1000) {
      await refreshIfNeeded(connectionId);
      const { data: refreshed } = await supabase.from('social_connections').select('*').eq('id', connectionId).single();
      if (refreshed) connection = refreshed;
    }

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Invalid token');

    const resp = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      await supabase.from('social_connections').update({
        last_error: data.error?.message || 'Test failed',
        last_verified_at: new Date().toISOString(),
      }).eq('id', connectionId);
      return new Response(JSON.stringify({ success: false, error: data.error?.message || 'Test failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const blogs = (data.items || []).map((b: any) => ({ id: b.id, name: b.name, url: b.url }));
    await supabase.from('social_connections').update({
      last_error: null,
      last_verified_at: new Date().toISOString(),
      metadata: { ...connection.metadata, blogs },
    }).eq('id', connectionId);

    return new Response(JSON.stringify({ success: true, blogs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[test-blogger-connection] error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));
