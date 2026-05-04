import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { resolveSocialPayload, SOCIAL_RESOLVE_MAP } from "./resolve-social-payload.ts";

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
  blogger: 'publish-blogger',
  wordpress: 'publish-wordpress',
  pinterest: 'publish-pinterest',
  bluesky: 'publish-bluesky',
};

// Map action → cặp cột URL/ID trên multi_channel_contents để lưu link bài đã publish
const URL_COLUMN_MAP: Record<string, { url: string; id: string }> = {
  website:    { url: 'website_post_url',    id: 'website_post_id' },
  blogger:    { url: 'blogger_post_url',    id: 'blogger_post_id' },
  wordpress:  { url: 'wordpress_post_url',  id: 'wordpress_post_id' },
  blog:       { url: 'flowa_blog_post_url', id: 'flowa_blog_post_id' },
  flowa_blog: { url: 'flowa_blog_post_url', id: 'flowa_blog_post_id' },
  pinterest:  { url: 'pinterest_post_url',  id: 'pinterest_post_id' },
  bluesky:    { url: 'bluesky_post_url',    id: 'bluesky_post_id' },
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
  // 2026-05: Blogger/WordPress are now SEPARATE channels with their own
  // content columns. They no longer mark 'website' as published.
  blogger: 'blogger',
  wordpress: 'wordpress',
  pinterest: 'pinterest',
  bluesky: 'bluesky',
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
    if (SOCIAL_RESOLVE_MAP[action]) {
      try {
        const supabase = getServiceClient();
        const resolved = await resolveSocialPayload({
          action,
          payload: finalPayload,
          supabase,
        });
        if (!resolved.ok) {
          return new Response(
            JSON.stringify({ success: false, error: resolved.error, errorCode: resolved.errorCode }),
            { status: resolved.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        finalPayload = resolved.payload;
        console.log(
          `[channel-publisher] resolved social payload for ${action}/${contentIdForResolve}: ` +
          `connectionId=${finalPayload.connectionId}, ` +
          `contentLen=${typeof finalPayload.content === 'string' ? finalPayload.content.length : 0}, ` +
          `media=${Array.isArray(finalPayload.mediaUrls) ? (finalPayload.mediaUrls as string[]).length : 0}`
        );
      } catch (resolveErr) {
        console.error('[channel-publisher] social payload resolve error:', resolveErr);
        return new Response(
          JSON.stringify({ success: false, error: 'Không tải được nội dung để đăng' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // === Resolve for BLOGGER/WORDPRESS actions ===
    // 2026-05: Blogger / WordPress / Website are 3 INDEPENDENT long-form channels.
    // Each platform MUST publish its OWN content column. NO fallback to website_content
    // (đã từng gây bug "Blog/Web/WordPress cùng 1 nội dung").
    if ((action === 'blogger' || action === 'wordpress') && typeof contentIdForResolve === 'string' &&
        (!finalPayload.connectionId || !finalPayload.content || !finalPayload.title)) {
      try {
        const supabase = getServiceClient();
        const contentColumn = action === 'blogger' ? 'blogger_content' : 'wordpress_content';
        const { data: mcc } = await supabase
          .from('multi_channel_contents')
          .select(`title, blogger_content, wordpress_content, organization_id, brand_template_id, featured_image_url, channel_images, blogger_seo_data, wordpress_seo_data`)
          .eq('id', contentIdForResolve)
          .maybeSingle();

        const resolvedContent = (mcc as any)?.[contentColumn] || null;

        if (!resolvedContent || (typeof resolvedContent === 'string' && resolvedContent.trim().length === 0)) {
          const label = action === 'wordpress' ? 'WordPress' : 'Blogger';
          return new Response(
            JSON.stringify({
              success: false,
              error: `Bài chưa có nội dung riêng cho ${label}. Mở bài, chọn tab ${label} và bấm "Tạo lại nội dung" để sinh bản ${label} riêng (không dùng chung Website).`,
              errorCode: 'EMPTY_CHANNEL_CONTENT',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!finalPayload.connectionId) {
          // wordpress action accepts both self-hosted ('wordpress') and WordPress.com ('wordpress_com') connections
          const platforms = action === 'wordpress' ? ['wordpress', 'wordpress_com'] : [action];
          let connQuery = supabase
            .from('social_connections')
            .select('id, platform')
            .in('platform', platforms)
            .eq('is_active', true)
            .eq('organization_id', mcc!.organization_id);
          if (mcc!.brand_template_id) {
            connQuery = connQuery.eq('brand_template_id', mcc!.brand_template_id);
          }
          const { data: conn } = await connQuery.limit(1).maybeSingle();
          if (!conn?.id) {
            const label = action === 'wordpress' ? 'WordPress' : 'Blogger';
            return new Response(
              JSON.stringify({ success: false, error: `Chưa kết nối ${label} cho brand này.`, errorCode: 'NO_CONNECTION' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          finalPayload.connectionId = conn.id;
        }

        if (!finalPayload.title) finalPayload.title = mcc!.title || 'Bài viết mới';
        if (!finalPayload.content) finalPayload.content = resolvedContent;
        if (!finalPayload.featuredImageUrl) {
          const ci = mcc.channel_images as Record<string, any> | null;
          const channelImg = ci?.[action]?.url || ci?.[action]?.image_url;
          const websiteImg = ci?.website?.url || ci?.website?.image_url;
          finalPayload.featuredImageUrl = channelImg || mcc.featured_image_url || websiteImg || undefined;
        }
        if (mcc.seo_data && !finalPayload.seoData) finalPayload.seoData = mcc.seo_data;
        if (mcc.organization_id) finalPayload.organization_id = mcc.organization_id;
      } catch (resolveErr) {
        console.error(`[channel-publisher] ${action} resolve error:`, resolveErr);
        return new Response(
          JSON.stringify({ success: false, error: `Không tải được nội dung ${action} để đăng` }),
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

    // Extract real post URL/ID from publisher response (publish-* return them at root)
    const respData = (parsedResponse?.data as Record<string, unknown> | undefined) ?? {};
    const postUrl =
      (parsedResponse?.postUrl as string | undefined) ||
      (respData?.postUrl as string | undefined) ||
      undefined;
    const postId =
      (parsedResponse?.postId as string | undefined) ||
      (respData?.postId as string | undefined) ||
      undefined;

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

            // 2026-05: blogger/wordpress are independent channels.
            // channelKey from CHANNEL_STATUS_KEY_MAP already resolves correctly.
            const effectiveChannelKey = channelKey;
            channelStatuses[effectiveChannelKey] = 'published';

            const allPublished = selectedChannels.every(ch => channelStatuses[ch] === 'published');
            const newStatus = allPublished ? 'published' : 'partially_published';

            // Build patch: status + channel_statuses + (URL/ID nếu có)
            const patch: Record<string, unknown> = {
              status: newStatus,
              channel_statuses: channelStatuses,
            };
            const cols = URL_COLUMN_MAP[action];
            if (cols) {
              if (postUrl) patch[cols.url] = postUrl;
              if (postId) patch[cols.id] = postId;
            }

            const { error: updateError } = await supabase
              .from('multi_channel_contents')
              .update(patch)
              .eq('id', contentId);

            if (updateError) {
              console.error('[channel-publisher] Failed to update content status:', updateError.message);
            } else {
              console.log(`[channel-publisher] Updated multi_channel_contents ${contentId} → ${newStatus} (${effectiveChannelKey}=published, url=${postUrl ?? 'n/a'})`);
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

      // --- Insert publish_attempts (audit log) + Telegram push (success OR failure) ---
      try {
        const supabase = getServiceClient();
        const [{ data: mcc }, { data: car }] = await Promise.all([
          supabase.from('multi_channel_contents').select('title, organization_id, created_by').eq('id', contentId).maybeSingle(),
          supabase.from('carousels').select('title, organization_id, created_by').eq('id', contentId).maybeSingle(),
        ]);
        const contentRow = mcc || car;
        const errMsg = !isSuccess
          ? (parsedResponse?.error as string | undefined) || `HTTP ${response.status}`
          : undefined;

        // Insert publish_attempts row (best-effort audit)
        if (contentRow?.organization_id) {
          try {
            await supabase.from('publish_attempts').insert({
              content_id: contentId,
              organization_id: contentRow.organization_id,
              connection_id: (finalPayload.connectionId as string | undefined) ?? null,
              platform: action,
              channel: ACTION_TO_CHANNEL[action] ?? action,
              status: isSuccess ? 'success' : 'failed',
              external_post_id: postId ?? null,
              external_post_url: postUrl ?? null,
              error_message: errMsg ?? null,
              response_payload: parsedResponse ?? null,
              completed_at: new Date().toISOString(),
            });
          } catch (auditErr) {
            console.error('[channel-publisher] publish_attempts insert error (non-fatal):', auditErr);
          }

          const { notifyPublishResult } = await import('../_shared/telegram-notifier.ts');
          await notifyPublishResult(
            supabase,
            contentRow.organization_id,
            contentRow.created_by ?? null,
            contentRow.title || 'Bài đăng',
            isSuccess,
            errMsg,
            { channel: action, postUrl: isSuccess ? postUrl : undefined },
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
