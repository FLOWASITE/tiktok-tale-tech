import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function ensureFreshToken(supabase: any, connection: any): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expiresAt - Date.now() < 10 * 60 * 1000 && connection.refresh_token) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    await fetch(`${supabaseUrl}/functions/v1/refresh-blogger-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ connectionId: connection.id }),
    });
    const { data: refreshed } = await supabase.from('social_connections').select('access_token').eq('id', connection.id).single();
    if (refreshed) return await decryptCredential(refreshed.access_token);
  }
  return await decryptCredential(connection.access_token);
}

function buildHtmlContent(rawContent: string, featuredImageUrl?: string): string {
  let html = rawContent || '';
  // If content is plain text (no tags), wrap paragraphs
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = html.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  }
  if (featuredImageUrl) {
    html = `<p><img src="${featuredImageUrl}" alt="" style="max-width:100%;height:auto;"/></p>\n${html}`;
  }
  return html;
}

Deno.serve(withPerf({ functionName: 'publish-blogger' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const {
      connectionId,
      title,
      content,
      labels = [],
      featuredImageUrl,
      blogId: requestedBlogId,
      isDraft = false,
    } = body;

    if (!connectionId) throw new Error('connectionId is required');
    if (!title) throw new Error('title is required');
    if (!content) throw new Error('content is required');

    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'blogger')
      .single();

    if (connError || !connection) throw new Error('Blogger connection not found');
    if (!connection.is_active) throw new Error('Blogger connection is inactive. Please reconnect.');

    const accessToken = await ensureFreshToken(supabase, connection);
    if (!accessToken) throw new Error('Could not obtain valid access token');

    const blogId = requestedBlogId || connection.metadata?.selected_blog_id || connection.page_id;
    if (!blogId) throw new Error('No blog selected. Please choose a blog in connection settings.');

    const htmlContent = buildHtmlContent(content, featuredImageUrl);

    const postUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${isDraft ? '?isDraft=true' : ''}`;
    const postResp = await fetch(postUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'blogger#post',
        title,
        content: htmlContent,
        labels: Array.isArray(labels) ? labels : [],
      }),
    });
    const postData = await postResp.json();

    if (!postResp.ok || postData.error) {
      const msg = postData.error?.message || `Blogger API error: ${postResp.status}`;
      await supabase.from('social_connections').update({ last_error: msg }).eq('id', connectionId);
      throw new Error(msg);
    }

    await supabase.from('social_connections').update({
      last_used_at: new Date().toISOString(),
      last_error: null,
    }).eq('id', connectionId);

    return new Response(JSON.stringify({
      success: true,
      postId: postData.id,
      postUrl: postData.url,
      published: postData.published,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[publish-blogger] error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}));
