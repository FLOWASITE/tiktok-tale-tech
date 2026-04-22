import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'publish-blog' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getServiceClient();

    // Verify auth
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isInternalCall = !!serviceRoleKey && token === serviceRoleKey;

    if (!isInternalCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        throw new Error('Unauthorized');
      }
    }

    const body = await req.json();
    const {
      title,
      content,
      excerpt,
      slug,
      cover_image,
      category,
      tags,
      seo_title,
      seo_description,
      author_name,
      read_time,
      organization_id,
      content_id,
      status = 'draft',
      is_public = false,
    } = body;

    if (!title || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'title and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug if not provided
    const finalSlug = slug || title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Determine if user can set is_public
    let finalIsPublic = false;
    if (is_public) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (roleData) {
        finalIsPublic = true;
      } else {
        console.log('[publish-blog] User attempted is_public but lacks admin role');
      }
    }

    const postData: Record<string, unknown> = {
      title,
      content,
      excerpt: excerpt || '',
      slug: finalSlug,
      cover_image: cover_image || null,
      category: category || 'General',
      tags: tags || [],
      seo_title: seo_title || title,
      seo_description: seo_description || excerpt || '',
      author_name: author_name || 'Flowa Team',
      read_time: read_time || null,
      organization_id: organization_id || null,
      content_id: content_id || null,
      status,
      is_public: finalIsPublic,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };

    // Upsert by slug
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(postData, { onConflict: 'slug' })
      .select('id, slug, status')
      .single();

    if (error) {
      console.error('[publish-blog] DB error:', error);
      throw new Error(error.message);
    }

    console.log(`[publish-blog] ${status} post: ${finalSlug}`);

    // NOTE: Status update for multi_channel_contents is now handled centrally
    // by channel-publisher/index.ts after receiving a successful response.

    return new Response(
      JSON.stringify({
        success: true,
        platform: 'blog',
        postId: data.id,
        postUrl: `/blog/${data.slug}`,
        message: status === 'published'
          ? 'Đã đăng bài blog thành công'
          : 'Đã lưu bài blog dạng nháp',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[publish-blog] error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
