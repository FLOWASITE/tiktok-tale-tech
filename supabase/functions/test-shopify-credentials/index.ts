import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Validates Shopify Public App credentials saved in social_platform_settings (admin form).
 * Falls back to legacy SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET env vars if no DB row.
 *
 * Shopify does NOT provide a client_credentials grant for app-level validation,
 * so we verify the saved values exist + match expected format.
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

    // 1. Try social_platform_settings first
    let clientId: string | null = null;
    let clientSecret: string | null = null;
    let source: 'admin_settings' | 'env' = 'admin_settings';

    const { data: settings } = await supabase
      .from('social_platform_settings')
      .select('consumer_key, consumer_secret, is_active')
      .eq('platform', 'shopify')
      .maybeSingle();

    if (settings?.consumer_key && settings?.consumer_secret) {
      if (settings.is_active === false) {
        return new Response(
          JSON.stringify({ success: false, error: 'Shopify đang bị tắt (is_active = false). Bật lại trong form Cấu hình.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      try {
        clientId = await decryptCredential(settings.consumer_key);
        clientSecret = await decryptCredential(settings.consumer_secret);
      } catch (e) {
        console.error('[test-shopify-credentials] decrypt failed:', e);
        return new Response(
          JSON.stringify({ success: false, error: 'Không giải mã được Client ID/Secret đã lưu. Hãy bấm Chỉnh sửa và nhập lại.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else {
      // 2. Fallback to legacy env secrets
      clientId = Deno.env.get('SHOPIFY_CLIENT_ID') || null;
      clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET') || null;
      source = 'env';
    }

    const missing: string[] = [];
    if (!clientId) missing.push('Shopify Client ID');
    if (!clientSecret) missing.push('Shopify Client Secret');

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Thiếu ${missing.join(' và ')}. Bấm Cấu hình để nhập tại Admin → Social Settings.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Format validation — Shopify Client ID là chuỗi alphanumeric ≥20 ký tự,
    // Client Secret thường bắt đầu shpss_ nhưng vẫn alphanumeric/underscore.
    const id = clientId!.trim();
    const secret = clientSecret!.trim();
    const idOk = /^[a-zA-Z0-9]{20,}$/.test(id);
    const secretOk = /^[a-zA-Z0-9_-]{20,}$/.test(secret);

    if (!idOk || !secretOk) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Client ID hoặc Secret không đúng format. Yêu cầu: chuỗi alphanumeric ≥20 ký tự. Hiện tại: ID=${id.length} ký tự, Secret=${secret.length} ký tự. Lấy lại tại Shopify Partners → App → API credentials.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: source === 'admin_settings'
          ? 'Shopify credentials hợp lệ (lấy từ Admin Social Settings). Test thực tế sẽ chạy khi merchant kết nối shop.'
          : 'Shopify credentials hợp lệ (đang dùng Edge Function Secrets cũ).',
        source,
        clientIdPreview: `${id.slice(0, 6)}...${id.slice(-4)}`,
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
