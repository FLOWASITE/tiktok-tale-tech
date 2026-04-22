import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FUNCTION_MAP: Record<string, string> = {
  zalo: 'publish-zalo',
  facebook: 'publish-facebook',
  instagram: 'publish-instagram',
  linkedin: 'publish-linkedin',
  twitter: 'publish-twitter',
  tiktok: 'publish-tiktok',
  threads: 'publish-threads',
  'google-business': 'publish-google-business',
  website: 'publish-website',
  blog: 'publish-blog',
  'flowa_blog': 'publish-blog',
};

// Map action back to the channel key used in selected_channels / channel_statuses
const ACTION_TO_CHANNEL: Record<string, string> = {
  zalo: 'zalo_oa',
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  twitter: 'twitter',
  tiktok: 'tiktok',
  threads: 'threads',
  'google-business': 'google_maps',
  website: 'website',
  blog: 'website',
  'flowa_blog': 'website',
};

Deno.serve(withPerf({ functionName: 'channel-publisher' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (!action || !PLATFORM_FUNCTION_MAP[action]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid action: ${action}. Supported: ${Object.keys(PLATFORM_FUNCTION_MAP).join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const functionName = PLATFORM_FUNCTION_MAP[action];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    console.log(`[channel-publisher] routing action="${action}" → ${functionName}`);

    // For flowa_blog, inject is_public = true into payload
    let finalPayload: Record<string, unknown> = action === 'flowa_blog' 
      ? { ...payload, is_public: true } 
      : { ...payload };

    // Resolve missing payload for website/blog when called from Telegram (only contentId provided)
    const contentIdForResolve = (payload as Record<string, unknown>).contentId || (payload as Record<string, unknown>).content_id;

    // === Resolve for SOCIAL channels (FB/IG/LinkedIn/Twitter/Threads/TikTok/Zalo/GBP) ===
    // Map: action → { dbPlatform, contentColumn }
    const SOCIAL_RESOLVE_MAP: Record<string, { dbPlatform: string; contentColumn: string; channelKey: string }> = {
      facebook: { dbPlatform: 'facebook', contentColumn: 'facebook_content', channelKey: 'facebook' },
      instagram: { dbPlatform: 'instagram', contentColumn: 'instagram_content', channelKey: 'instagram' },
      linkedin: { dbPlatform: 'linkedin', contentColumn: 'linkedin_content', channelKey: 'linkedin' },
      twitter: { dbPlatform: 'twitter', contentColumn: 'twitter_content', channelKey: 'twitter' },
      threads: { dbPlatform: 'threads', contentColumn: 'threads_content', channelKey: 'threads' },
      tiktok: { dbPlatform: 'tiktok', contentColumn: 'tiktok_content', channelKey: 'tiktok' },
      zalo: { dbPlatform: 'zalo_oa', contentColumn: 'zalo_content', channelKey: 'zalo_oa' },
      'google-business': { dbPlatform: 'google_business', contentColumn: 'google_business_content', channelKey: 'google_maps' },
    };

    const socialMap = SOCIAL_RESOLVE_MAP[action];
    if (
      socialMap &&
      typeof contentIdForResolve === 'string' &&
      (!finalPayload.connectionId || !finalPayload.content)
    ) {
      try {
        const supabase = getServiceClient();
        // Select all possible content columns + meta. Use generic select to support fallback.
        const { data: mcc, error: mccErr } = await supabase
          .from('multi_channel_contents')
          .select('*')
          .eq('id', contentIdForResolve)
          .maybeSingle();

        if (mccErr || !mcc) {
          return new Response(
            JSON.stringify({ success: false, error: 'Không tìm thấy nội dung' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const mccRow = mcc as Record<string, any>;
        const channelContent =
          mccRow[socialMap.contentColumn] ||
          mccRow.content ||
          '';

        if (!channelContent || typeof channelContent !== 'string' || !channelContent.trim()) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Bài chưa có nội dung cho ${socialMap.dbPlatform}. Vui lòng tạo nội dung kênh này trước.`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Lookup connection
        if (!finalPayload.connectionId) {
          let connQuery = supabase
            .from('social_connections')
            .select('id')
            .eq('platform', socialMap.dbPlatform)
            .eq('is_active', true)
            .eq('organization_id', mccRow.organization_id);
          if (mccRow.brand_template_id) {
            connQuery = connQuery.eq('brand_template_id', mccRow.brand_template_id);
          }
          const { data: conn } = await connQuery.limit(1).maybeSingle();

          if (!conn?.id) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `Chưa kết nối ${socialMap.dbPlatform}. Vui lòng kết nối lại.`,
                errorCode: 'NO_CONNECTION',
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          finalPayload.connectionId = conn.id;
        }

        finalPayload.content = channelContent;

        // Resolve media URLs from channel_images[channelKey] if present
        try {
          const channelImages = mccRow.channel_images as Record<string, any> | null;
          if (channelImages && typeof channelImages === 'object') {
            const imgs = channelImages[socialMap.channelKey];
            if (Array.isArray(imgs) && imgs.length > 0) {
              const urls = imgs
                .map((it: any) => (typeof it === 'string' ? it : it?.url || it?.image_url))
                .filter((u: any) => typeof u === 'string' && u.trim());
              if (urls.length > 0) {
                finalPayload.mediaUrls = urls;
                if (!finalPayload.mediaUrl) finalPayload.mediaUrl = urls[0];
              }
            }
          }
        } catch (_imgErr) { /* non-fatal */ }

        if (mccRow.organization_id) finalPayload.organization_id = mccRow.organization_id;

        console.log(`[channel-publisher] resolved social payload for ${action}/${contentIdForResolve}: connectionId=${finalPayload.connectionId}, contentLen=${channelContent.length}, media=${Array.isArray(finalPayload.mediaUrls) ? (finalPayload.mediaUrls as string[]).length : 0}`);
      } catch (resolveErr) {
        console.error('[channel-publisher] social payload resolve error:', resolveErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Không tải được nội dung để đăng' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (
      ['website', 'blog', 'flowa_blog'].includes(action) &&
      typeof contentIdForResolve === 'string' &&
      !finalPayload.connectionId &&
      (!finalPayload.title || !finalPayload.content)
    ) {
      try {
        const supabase = getServiceClient();
        const { data: mcc } = await supabase
          .from('multi_channel_contents')
          .select('title, website_content, organization_id, brand_template_id, featured_image_url, seo_data')
          .eq('id', contentIdForResolve)
          .maybeSingle();

        if (!mcc?.website_content) {
          return new Response(
            JSON.stringify({ success: false, error: 'Content not found or missing website body' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For blog/flowa_blog, no connection lookup needed (uses internal blog_posts)
        if (action === 'website') {
          let connQuery = supabase
            .from('social_connections')
            .select('id')
            .eq('platform', 'website')
            .eq('is_active', true)
            .eq('organization_id', mcc.organization_id);
          if (mcc.brand_template_id) {
            connQuery = connQuery.eq('brand_template_id', mcc.brand_template_id);
          }
          const { data: conn } = await connQuery.maybeSingle();

          if (!conn?.id) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Chưa kết nối website cho brand này',
                errorCode: 'NO_CONNECTION',
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          finalPayload.connectionId = conn.id;
          finalPayload.status = finalPayload.status || 'publish';
        }

        finalPayload.title = mcc.title;
        finalPayload.content = mcc.website_content;
        if (mcc.featured_image_url) finalPayload.featuredImageUrl = mcc.featured_image_url;
        if (mcc.seo_data) finalPayload.seoData = mcc.seo_data;
        if (mcc.organization_id) finalPayload.organization_id = mcc.organization_id;

        console.log(`[channel-publisher] resolved payload for ${action}/${contentIdForResolve}: connectionId=${finalPayload.connectionId ?? 'n/a'}`);
      } catch (resolveErr) {
        console.error('[channel-publisher] payload resolve error:', resolveErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Không tải được nội dung để đăng' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        apikey: apiKey,
      },
      body: JSON.stringify(finalPayload),
    });

    // Stream the response back transparently
    const responseBody = await response.text();

    // === Centralized status update + Telegram notif after publish ===
    const contentId = payload.contentId || payload.content_id;
    let parsedResponse: Record<string, unknown> | null = null;
    try { parsedResponse = JSON.parse(responseBody); } catch { /* not JSON */ }
    const isSuccess = response.ok && parsedResponse?.success === true;

    if (contentId) {
      try {
        if (isSuccess) {
          const channelKey = ACTION_TO_CHANNEL[action] || action;
          const supabase = getServiceClient();

          // --- Update multi_channel_contents if applicable ---
          const { data: contentData } = await supabase
            .from('multi_channel_contents')
            .select('selected_channels, channel_statuses, status')
            .eq('id', contentId)
            .single();

          if (contentData) {
            const selectedChannels: string[] = contentData.selected_channels || [];
            const channelStatuses: Record<string, string> = (contentData.channel_statuses as Record<string, string>) || {};
            channelStatuses[channelKey] = 'published';

            const allPublished = selectedChannels.every(ch => channelStatuses[ch] === 'published');
            const newStatus = allPublished ? 'published' : 'partially_published';

            const { error: updateError } = await supabase
              .from('multi_channel_contents')
              .update({ status: newStatus, channel_statuses: channelStatuses })
              .eq('id', contentId);

            if (updateError) {
              console.error('[channel-publisher] Failed to update content status:', updateError.message);
            } else {
              console.log(`[channel-publisher] Updated multi_channel_contents ${contentId} → ${newStatus} (${channelKey}=published)`);
            }
          }

          // --- Update carousels table if applicable ---
          const { data: carouselData } = await supabase
            .from('carousels')
            .select('id, status, published_channels')
            .eq('id', contentId)
            .single();

          if (carouselData) {
            const existingPublishedChannels = Array.isArray(carouselData.published_channels)
              ? carouselData.published_channels.filter((value): value is string => typeof value === 'string')
              : [];
            const nextPublishedChannels = Array.from(new Set([...existingPublishedChannels, channelKey]));

            const newCarouselStatus = 'published';
            const { error: carouselUpdateError } = await supabase
              .from('carousels')
              .update({
                status: newCarouselStatus,
                published_channels: nextPublishedChannels,
                updated_at: new Date().toISOString(),
              })
              .eq('id', contentId);

            if (carouselUpdateError) {
              console.error('[channel-publisher] Failed to update carousel status:', carouselUpdateError.message);
            } else {
              console.log(`[channel-publisher] Updated carousels ${contentId} → ${newCarouselStatus} (${channelKey}=published, channels=${nextPublishedChannels.join(',')})`);
            }
          }
        }
      } catch (statusErr) {
        console.error('[channel-publisher] Status update error (non-fatal):', statusErr);
      }

      // --- Telegram push: success OR failure ---
      try {
        const supabase = getServiceClient();
        const [{ data: mcc }, { data: car }] = await Promise.all([
          supabase.from('multi_channel_contents').select('title, organization_id, created_by').eq('id', contentId).maybeSingle(),
          supabase.from('carousels').select('title, organization_id, created_by').eq('id', contentId).maybeSingle(),
        ]);
        const contentRow = mcc || car;
        if (contentRow?.organization_id) {
          const errMsg = !isSuccess
            ? (parsedResponse?.error as string | undefined) || `HTTP ${response.status}`
            : undefined;
          const postUrl = isSuccess
            ? ((parsedResponse?.data as any)?.postUrl || (parsedResponse?.postUrl as string | undefined))
            : undefined;
          const { notifyPublishResult } = await import('../_shared/telegram-notifier.ts');
          await notifyPublishResult(
            supabase,
            contentRow.organization_id,
            contentRow.created_by ?? null,
            contentRow.title || 'Bài đăng',
            isSuccess,
            errMsg,
            { channel: action, postUrl },
          );
        }
      } catch (notifErr) {
        console.error('[channel-publisher] Telegram notify error (non-fatal):', notifErr);
      }
    }

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[channel-publisher] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal routing error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
