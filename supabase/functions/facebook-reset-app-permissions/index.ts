import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decrypt as decryptGCM } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Revokes Facebook app authorization for the connected user so the next OAuth
 * flow shows the FULL Page picker again (not just previously authorized pages).
 *
 * Body: { brand_template_id: string }
 *
 * Steps:
 *  1. Auth user via JWT.
 *  2. Find ANY active facebook social_connection for that brand owned by the user.
 *  3. Decrypt page access_token → exchange to user-level via debug_token? Not needed:
 *     calling DELETE /me/permissions with a Page access token would only revoke at the
 *     Page scope. Instead we look up an OAuth session row that still has the user_token
 *     OR fall back to calling DELETE /{user_id}/permissions with the page token (which
 *     Facebook does accept for the owning user when the page token derives from the user).
 *  4. After revoke, deactivate local connections so the user reconnects clean.
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

    // Verify access to brand
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

    // Find most recent OAuth session (preferred — has user-level token implicitly via me/accounts)
    // Strategy: revoke via stored page access token by calling DELETE on the page's owning user.
    // We fetch the connection's platform_user_id (page id) and access_token, then use Graph
    // endpoint /{page_id}/subscribed_apps DELETE + DELETE /me/permissions with the page token,
    // which Facebook treats as a deauthorize for the app for the underlying user.
    const { data: connections } = await supabase
      .from('social_connections')
      .select('id, platform_user_id, access_token')
      .eq('platform', 'facebook')
      .eq('brand_template_id', brand_template_id)
      .eq('is_active', true);

    if (!connections || connections.length === 0) {
      return json({
        success: true,
        revoked: false,
        message: 'Không có kết nối Facebook nào để reset. Hãy bấm Kết nối Facebook và chọn lại Page trong cửa sổ OAuth.',
      });
    }

    let revokedAny = false;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        const pageToken = await decryptGCM(conn.access_token as string);
        if (!pageToken) continue;

        // Unsubscribe webhooks first (best effort)
        await fetch(
          `https://graph.facebook.com/v21.0/${conn.platform_user_id}/subscribed_apps`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ access_token: pageToken }).toString(),
          }
        ).catch(() => {});

        // Revoke app authorization for the underlying user. Using "me" with a page
        // token revokes at the page level only; we need the user_id. Page token's
        // /me returns the page itself, so we ask for the page's owning user via /me?fields=...
        // Then DELETE /{user_id}/permissions.
        const meResp = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id&access_token=${encodeURIComponent(pageToken)}`
        );
        const meData = await meResp.json().catch(() => ({}));

        // Try DELETE /{page_id}/permissions first (revokes app for that page)
        const pageRevoke = await fetch(
          `https://graph.facebook.com/v21.0/${conn.platform_user_id}/permissions?access_token=${encodeURIComponent(pageToken)}`,
          { method: 'DELETE' }
        );
        if (pageRevoke.ok) revokedAny = true;
        else {
          const txt = await pageRevoke.text().catch(() => '');
          errors.push(`page ${conn.platform_user_id}: ${txt.slice(0, 160)}`);
        }
        // (We intentionally do NOT call /me/permissions with the page token to avoid
        // revoking unrelated pages of the same user.)
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    // Mark all FB connections inactive so user reconnects fresh
    await supabase
      .from('social_connections')
      .update({ is_active: false })
      .eq('platform', 'facebook')
      .eq('brand_template_id', brand_template_id);

    return json({
      success: true,
      revoked: revokedAny,
      pages_reset: connections.length,
      errors: errors.length ? errors : undefined,
      message: revokedAny
        ? 'Đã reset quyền Facebook. Bấm "Kết nối Facebook" và chọn lại Page bạn muốn quản lý.'
        : 'Đã hủy kết nối local. Hãy vào Facebook → Settings → Business Integrations → chọn app Flowa → Remove, rồi quay lại bấm Kết nối Facebook.',
    });
  } catch (e) {
    console.error('[facebook-reset-app-permissions] error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
}));
