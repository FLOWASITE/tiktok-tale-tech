import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";
import { shopifyAdminFetch } from "../_shared/shopify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildHtmlContent(rawContent: string, featuredImageUrl?: string): string {
  let html = rawContent || '';
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = html.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  }
  if (featuredImageUrl) {
    html = `<p><img src="${featuredImageUrl}" alt="" style="max-width:100%;height:auto;"/></p>\n${html}`;
  }
  return html;
}

interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

async function resolveBlogId(shop: string, accessToken: string, requested?: number | string, fallback?: number | string): Promise<number> {
  const id = requested ?? fallback;
  if (id) return Number(id);
  // Auto-pick first blog (most stores have a default "News" blog)
  const resp = await shopifyAdminFetch(shop, accessToken, 'blogs.json?limit=1');
  const data = await resp.json();
  if (!resp.ok || !data?.blogs?.length) {
    throw new Error('Shopify store has no blogs. Create one in Shopify Admin → Online Store → Blog Posts → Manage blogs.');
  }
  return (data.blogs as ShopifyBlog[])[0].id;
}

Deno.serve(withPerf({ functionName: 'publish-shopify-blog' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const {
      connectionId,
      content,
      tags = [],
      featuredImageUrl,
      blogId: requestedBlogId,
      isDraft = false,
      summary,
      author,
    } = body;
    let { title } = body;

    if (!connectionId) throw new Error('connectionId is required');
    if (!content) throw new Error('content is required');

    if (!title || typeof title !== 'string' || !title.trim()) {
      const firstLine = String(content)
        .split('\n')
        .map((l: string) => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
        .find((l: string) => l.length > 0);
      title = (firstLine || 'Bài viết mới').substring(0, 200);
    }

    const { data: connection, error: connError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform', 'shopify')
      .single();

    if (connError || !connection) throw new Error('Shopify connection not found');
    if (!connection.is_active) throw new Error('Shopify connection is inactive. Please reconnect.');

    const shop = connection.metadata?.shop || connection.platform_username;
    if (!shop) throw new Error('Shop domain missing on connection');

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Could not decrypt Shopify access token');

    const blogId = await resolveBlogId(shop, accessToken, requestedBlogId, connection.metadata?.selected_blog_id);

    const htmlContent = buildHtmlContent(content, featuredImageUrl);

    const articlePayload: Record<string, unknown> = {
      title: String(title).substring(0, 255),
      body_html: htmlContent,
      published: !isDraft,
      tags: Array.isArray(tags) ? tags.join(', ') : String(tags || ''),
    };
    if (summary) articlePayload.summary_html = `<p>${String(summary).substring(0, 500)}</p>`;
    if (author) articlePayload.author = String(author);
    if (featuredImageUrl) {
      articlePayload.image = { src: featuredImageUrl };
    }

    const postResp = await shopifyAdminFetch(
      shop,
      accessToken,
      `blogs/${blogId}/articles.json`,
      { method: 'POST', body: JSON.stringify({ article: articlePayload }) },
    );
    const postData = await postResp.json();

    if (!postResp.ok || postData.errors) {
      const msg = typeof postData.errors === 'string'
        ? postData.errors
        : JSON.stringify(postData.errors || { status: postResp.status });
      await supabase.from('social_connections').update({ last_error: msg }).eq('id', connectionId);
      throw new Error(`Shopify API error: ${msg}`);
    }

    const article = postData.article;
    const articleUrl = `https://${shop.replace('.myshopify.com', '')}.myshopify.com/blogs/${article.handle ?? ''}`;

    await supabase.from('social_connections').update({
      last_used_at: new Date().toISOString(),
      last_error: null,
    }).eq('id', connectionId);

    return new Response(JSON.stringify({
      success: true,
      postId: article.id,
      postUrl: article.url || articleUrl,
      handle: article.handle,
      published: article.published_at,
      isDraft,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[publish-shopify-blog] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
