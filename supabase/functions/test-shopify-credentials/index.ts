import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates Shopify Public App credentials are configured in Edge Function secrets.
 * Shopify does NOT provide a client_credentials grant for app-level validation,
 * so we verify the secrets exist and have the expected format. Real OAuth handshake
 * is exercised when a merchant connects their shop.
 */
Deno.serve(withPerf({ functionName: 'test-shopify-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === 'admin');
    if (!isAdmin) throw new Error('Admin access required');

    const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

    const missing: string[] = [];
    if (!clientId) missing.push('SHOPIFY_CLIENT_ID');
    if (!clientSecret) missing.push('SHOPIFY_CLIENT_SECRET');

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Thiếu secret: ${missing.join(', ')}. Cấu hình tại Edge Function Secrets.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Shopify Client ID/Secret: alphanumeric, thường ~32 ký tự (không bắt buộc hex)
    const idOk = /^[a-zA-Z0-9]{20,}$/.test(clientId!.trim());
    const secretOk = /^[a-zA-Z0-9_-]{20,}$/.test(clientSecret!.trim());

    if (!idOk || !secretOk) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Client ID/Secret không đúng format. Yêu cầu: chuỗi alphanumeric ≥20 ký tự. Hiện tại: ID=${clientId!.length} ký tự, Secret=${clientSecret!.length} ký tự. Kiểm tra lại tại Shopify Partners → App → API credentials.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Shopify credentials đã cấu hình hợp lệ. Test thực tế sẽ chạy khi merchant kết nối shop.',
        clientIdPreview: `${clientId!.slice(0, 6)}...${clientId!.slice(-4)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[test-shopify-credentials] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
