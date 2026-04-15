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
    const finalPayload = action === 'flowa_blog' 
      ? { ...payload, is_public: true } 
      : payload;

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

    // === Centralized status update after successful publish ===
    const contentId = payload.contentId || payload.content_id;
    if (response.ok && contentId) {
      try {
        let parsedResponse: Record<string, unknown> | null = null;
        try { parsedResponse = JSON.parse(responseBody); } catch { /* not JSON */ }
        
        const isSuccess = parsedResponse?.success === true;
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

            // For carousels we simply mark as published (no selected_channels tracking)
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
