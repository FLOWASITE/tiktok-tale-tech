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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
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
      // Check if user has admin role
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

    // Update multi_channel_contents status based on channel publish progress
    if (content_id && status === 'published') {
      // Get the content to check how many channels are selected vs published
      const { data: contentData } = await supabase
        .from('multi_channel_contents')
        .select('selected_channels, channel_statuses')
        .eq('id', content_id)
        .single();
      
      let newStatus = 'partially_published';
      if (contentData) {
        const selectedChannels: string[] = contentData.selected_channels || [];
        const channelStatuses: Record<string, string> = (contentData.channel_statuses as Record<string, string>) || {};
        // Mark blog/website channel as published
        channelStatuses['website'] = 'published';
        
        // Check if ALL selected channels are published
        const allPublished = selectedChannels.every(ch => channelStatuses[ch] === 'published');
        newStatus = allPublished ? 'published' : 'partially_published';
        
        const { error: updateError } = await supabase
          .from('multi_channel_contents')
          .update({ status: newStatus, channel_statuses: channelStatuses })
          .eq('id', content_id);
        
        if (updateError) {
          console.error('[publish-blog] Failed to update content status:', updateError.message);
        } else {
          console.log(`[publish-blog] Updated multi_channel_contents ${content_id} to ${newStatus}`);
        }
      }
    }

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
