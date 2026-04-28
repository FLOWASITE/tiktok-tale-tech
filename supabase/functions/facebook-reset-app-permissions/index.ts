import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const BUSINESS_TOOLS_URL = 'https://www.facebook.com/settings?tab=business_tools';

/**
 * Revoke Facebook app authorization at the USER level so the next OAuth
 * flow shows the FULL Page picker again.
 *
 * Strategy:
 *  1. Find latest facebook_oauth_sessions for this user+brand → has encrypted_user_token.
 *  2. Decrypt user token, debug-list pages user actually manages (for diagnostics).
 *  3. Call DELETE /me/permissions with USER token → real revoke.
 *  4. Deactivate local social_connections + delete stored sessions to prevent token reuse.
 *  5. If no usable user token → return revoked:false + manual instructions URL.
 */
Deno.serve(withPerf({ functionName: 'facebook-reset-app-permissions' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const { brand_template_id } = body || {};
    if (!brand_template_id) return json({ error: 'brand_template_id required' }, 400);

    // Verify access
    const { data: brand } = await supabase
      .from('brand_templates')
      .select('id, organization_id, user_id')
      .eq('id', brand_template_id)
      .maybeSingle();
    if (!brand) return json({ error: 'Brand not found' }, 404);
    if (brand.user_id !== user.id && brand.organization_id) {
      const { data: m } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', brand.organization_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!m) return json({ error: 'Forbidden' }, 403);
    } else if (brand.user_id !== user.id) {
      return json({ error: 'Forbidden' }, 403);
    }

    // 1. Get latest OAuth session with user token
    const { data: sessions } = await supabase
      .from('facebook_oauth_sessions')
      .select('id, encrypted_user_token, created_at')
      .eq('user_id', user.id)
      .eq('brand_template_id', brand_template_id)
      .order('created_at', { ascending: false })
      .limit(1);

    const session = sessions?.[0];
    let userToken: string | null = null;

    if (session?.encrypted_user_token) {
      try {
        userToken = await decryptCredential(session.encrypted_user_token);
      } catch (e) {
        console.warn('[reset-fb] Failed to decrypt user token:', e instanceof Error ? e.message : e);
      }
    }

    // Always cleanup local state (will reconnect fresh either way)
    const cleanupLocal = async () => {
      await supabase
        .from('social_connections')
        .update({ is_active: false })
        .eq('platform', 'facebook')
        .eq('brand_template_id', brand_template_id);
      await supabase
        .from('facebook_oauth_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('brand_template_id', brand_template_id);
    };

    if (!userToken) {
      await cleanupLocal();
      return json({
        success: true,
        revoked: false,
        manual_action_required: true,
        manual_url: BUSINESS_TOOLS_URL,
        message:
          'Không tìm thấy token Facebook hợp lệ để revoke tự động. Hãy mở Facebook Settings → Business Integrations → tìm "Flowa" → Remove. Sau đó quay lại bấm "Kết nối Facebook".',
      });
    }

    // 2. Diagnostic: how many pages does this FB user actually manage?
    let actualPagesCount = 0;
    try {
      const accountsResp = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?limit=100&fields=id,name&access_token=${encodeURIComponent(userToken)}`
      );
      const accountsData = await accountsResp.json().catch(() => ({}));
      if (Array.isArray(accountsData?.data)) {
        actualPagesCount = accountsData.data.length;
        console.log(`[reset-fb] Facebook user actually manages ${actualPagesCount} Page(s):`, accountsData.data.map((p: any) => `${p.name} (${p.id})`).join(', '));
      } else if (accountsData?.error) {
        console.warn('[reset-fb] me/accounts error:', accountsData.error);
      }
    } catch (e) {
      console.warn('[reset-fb] me/accounts probe failed:', e instanceof Error ? e.message : e);
    }

    // 3. REAL revoke at user level
    let revoked = false;
    let revokeError: string | null = null;
    try {
      const revokeResp = await fetch(
        `https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(userToken)}`,
        { method: 'DELETE' }
      );
      const revokeData = await revokeResp.json().catch(() => ({}));
      if (revokeResp.ok && revokeData?.success) {
        revoked = true;
        console.log('[reset-fb] User-level app permissions revoked successfully');
      } else {
        revokeError = JSON.stringify(revokeData).slice(0, 300);
        console.warn('[reset-fb] revoke failed:', revokeError);
      }
    } catch (e) {
      revokeError = e instanceof Error ? e.message : String(e);
      console.warn('[reset-fb] revoke exception:', revokeError);
    }

    // 4. Cleanup local
    await cleanupLocal();

    if (!revoked) {
      return json({
        success: true,
        revoked: false,
        manual_action_required: true,
        manual_url: BUSINESS_TOOLS_URL,
        actual_pages_count: actualPagesCount,
        error: revokeError,
        message:
          'Token đã hết hạn hoặc Facebook từ chối revoke tự động. Hãy mở Facebook Settings → Business Integrations → "Flowa" → Remove, rồi quay lại kết nối.',
      });
    }

    return json({
      success: true,
      revoked: true,
      actual_pages_count: actualPagesCount,
      message: actualPagesCount <= 1
        ? `Đã reset quyền Facebook. Lưu ý: tài khoản FB của bạn hiện chỉ quản lý ${actualPagesCount} Page. Nếu muốn thêm Page khác, hãy đảm bảo bạn là Admin của Page đó tại facebook.com/pages.`
        : `Đã reset quyền Facebook. Tài khoản của bạn quản lý ${actualPagesCount} Page — bấm "Kết nối Facebook" để chọn lại.`,
    });
  } catch (e) {
    console.error('[facebook-reset-app-permissions] error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
}));
