import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-wordpress-com-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { connectionId, brandTemplateId, organizationId } = body || {};

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let query = supabase
      .from('social_connections')
      .select('*')
      .eq('platform', 'wordpress_com')
      .eq('is_active', true)
      .limit(1);

    if (connectionId) query = query.eq('id', connectionId);
    else if (brandTemplateId) query = query.eq('brand_template_id', brandTemplateId);
    else if (organizationId) query = query.eq('organization_id', organizationId);

    const { data: conn, error } = await query.maybeSingle();

    if (error || !conn) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Chưa có kết nối WordPress.com nào active. Vui lòng kết nối lại.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = (conn as any).access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Không tìm thấy access token. Vui lòng kết nối lại WordPress.com.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://public-api.wordpress.com/rest/v1.1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `WordPress.com trả lỗi ${res.status}: ${text.slice(0, 200)}`,
          hint: 'Token có thể đã hết hạn hoặc bị thu hồi. Hãy ngắt kết nối và kết nối lại.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const me = await res.json();
    return new Response(
      JSON.stringify({
        success: true,
        message: `Kết nối WordPress.com thành công! Đăng nhập với "${me.display_name || me.username}".`,
        details: {
          id: me.ID,
          username: me.username,
          display_name: me.display_name,
          site: conn.platform_username,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test WordPress.com connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
