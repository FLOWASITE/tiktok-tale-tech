import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) return url;
  // Strip common admin paths user may have copied
  url = url.replace(/\/(wp-admin|wp-login\.php).*$/i, '');
  // Remove trailing slash
  url = url.replace(/\/+$/, '');
  // Add https:// if missing
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(withPerf({ functionName: 'test-wordpress-credentials' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json().catch(() => ({}));
    const { siteUrl, username, applicationPassword } = body as {
      siteUrl?: string;
      username?: string;
      applicationPassword?: string;
    };

    if (!siteUrl || !username || !applicationPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'missing_fields',
          error: 'Thiếu thông tin: cần Site URL, Username và Application Password.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUrl = normalizeUrl(siteUrl);
    const cleanPassword = applicationPassword.replace(/\s+/g, '');
    const basicAuth = `Basic ${btoa(`${username.trim()}:${cleanPassword}`)}`;

    // Step 1: Probe REST API root for siteTitle and version
    let siteTitle = '';
    let wpVersion = '';
    try {
      const rootRes = await fetchWithTimeout(`${normalizedUrl}/wp-json/`, {
        headers: { Accept: 'application/json' },
      }, 8000);

      const ct = rootRes.headers.get('content-type') || '';
      if (!rootRes.ok || !ct.includes('json')) {
        return new Response(
          JSON.stringify({
            success: false,
            code: 'rest_api_unavailable',
            error: 'Không tìm thấy REST API tại site này. Hãy kiểm tra URL đúng và WordPress đang bật permalinks (không phải "Plain").',
            normalizedUrl,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rootJson = await rootRes.json();
      siteTitle = rootJson?.name || '';
      // wp version isn't in /wp-json/ root, but namespace info hints WP exists
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          success: false,
          code: err.name === 'AbortError' ? 'timeout' : 'unreachable',
          error: err.name === 'AbortError'
            ? 'Site không phản hồi (quá 8 giây). Kiểm tra URL hoặc thử lại.'
            : `Không kết nối được: ${err.message}`,
          normalizedUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Authenticated probe — /wp-json/wp/v2/users/me
    const meRes = await fetchWithTimeout(`${normalizedUrl}/wp-json/wp/v2/users/me?context=edit`, {
      headers: {
        Authorization: basicAuth,
        Accept: 'application/json',
      },
    }, 10000);

    if (meRes.status === 401) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'invalid_credentials',
          error: 'Sai username hoặc Application Password. Hãy thử tạo lại Application Password mới trong WordPress.',
          normalizedUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (meRes.status === 403) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'insufficient_permission',
          error: 'User này không có quyền publish bài viết. Cần role Editor hoặc Administrator.',
          normalizedUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!meRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'api_error',
          error: `WordPress trả về lỗi (HTTP ${meRes.status}).`,
          normalizedUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const meJson = await meRes.json();
    const userCaps = meJson?.capabilities || {};
    const canPublish = !!(userCaps.publish_posts || userCaps.edit_published_posts || userCaps.administrator);

    if (!canPublish) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'cannot_publish',
          error: 'User đăng nhập được nhưng không có quyền publish_posts.',
          normalizedUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Kết nối WordPress thành công!',
        normalizedUrl,
        siteTitle,
        wpVersion,
        user: {
          id: meJson?.id,
          name: meJson?.name,
          slug: meJson?.slug,
          roles: meJson?.roles,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test WordPress credentials error:', error);
    return new Response(
      JSON.stringify({ success: false, code: 'server_error', error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
