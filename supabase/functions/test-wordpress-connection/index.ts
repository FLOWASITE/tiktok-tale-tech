import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'test-wordpress-connection' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { siteUrl, username, applicationPassword } = body || {};

    if (!siteUrl || !username || !applicationPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cần Site URL, Username và Application Password để test kết nối.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const base = String(siteUrl).replace(/\/+$/, '');
    const auth = btoa(`${username}:${applicationPassword}`);

    const res = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `WordPress trả lỗi ${res.status}: ${text.slice(0, 200)}`,
          hint: 'Kiểm tra Site URL có /wp-json/ truy cập được, username chính xác, Application Password được tạo trong Users → Profile → Application Passwords.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const me = await res.json();
    return new Response(
      JSON.stringify({
        success: true,
        message: `Kết nối WordPress thành công! Đăng nhập với "${me.name || me.slug}".`,
        details: { id: me.id, name: me.name, roles: me.roles },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test WordPress connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
