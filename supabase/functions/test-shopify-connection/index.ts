import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { shopifyFetch, getShopInfo, listBlogs } from "../_shared/shopify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-shopify-connection' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'shopify')
      .single();

    if (!connection) throw new Error('Connection not found');

    const shop = connection.metadata?.shop || connection.platform_username;
    if (!shop) throw new Error('Shop domain missing on connection');

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Invalid token');

    // Verify token by hitting /shop.json
    let shopInfo: Awaited<ReturnType<typeof getShopInfo>>;
    try {
      shopInfo = await getShopInfo(shop, accessToken);
    } catch (e: any) {
      const msg = e?.message || 'Token invalid or app uninstalled';
      const isAuthError = /401|403|unauthorized|invalid_token/i.test(msg);
      await supabase.from('social_connections').update({
        last_error: msg,
        last_verified_at: new Date().toISOString(),
        ...(isAuthError ? { is_active: false } : {}),
      }).eq('id', connectionId);
      return new Response(
        JSON.stringify({ success: false, error: msg, requiresReconnect: isAuthError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Also fetch blogs for picker UI
    let blogs: Array<{ id: number; title: string; handle: string }> = [];
    try {
      blogs = await listBlogs(shop, accessToken);
    } catch { /* non-fatal */ }

    await supabase.from('social_connections').update({
      last_error: null,
      last_verified_at: new Date().toISOString(),
      metadata: { ...connection.metadata, shop, blogs, shop_info: shopInfo },
    }).eq('id', connectionId);

    return new Response(
      JSON.stringify({ success: true, shop: shopInfo, blogs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[test-shopify-connection] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
